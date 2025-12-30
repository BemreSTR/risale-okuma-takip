import { useState, useEffect } from 'react';
import './index.css';
import { supabase } from './supabase';
import { validatePagesInput, validateName, getTodayStr } from './utils/helpers';

// Pages
import AuthView from './pages/AuthView';
import HomeView from './pages/HomeView';
import CalendarView from './pages/CalendarView';
import FriendsView from './pages/FriendsView';
import ProfileView from './pages/ProfileView';
import HatimlerView from './pages/HatimlerView';

// Components
import NavBar from './components/NavBar';
import ReadModal from './components/modals/ReadModal';
import AddBookModal from './components/modals/AddBookModal';
import EditNameModal from './components/modals/EditNameModal';
import PasswordResetModal from './components/modals/PasswordResetModal';
import HatimEditModal from './components/modals/HatimEditModal';

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // App State
  const [activeTab, setActiveTab] = useState('home');
  const [showHatimler, setShowHatimler] = useState(false);
  const [editHatimModal, setEditHatimModal] = useState(false);
  const [selectedHatimBook, setSelectedHatimBook] = useState(null);
  const [hatimCountInput, setHatimCountInput] = useState('');

  // Data
  const [myBooks, setMyBooks] = useState([]);
  const [finishedStats, setFinishedStats] = useState({});
  const [logs, setLogs] = useState({});

  // UI States
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);
  const [pagesInput, setPagesInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  const [editNameModal, setEditNameModal] = useState(false);
  const [newNameInput, setNewNameInput] = useState('');

  // 1. Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user);
        fetchUserProfile(session.user.id);
      }
      setLoadingAuth(false);

      // Hash kontrolü (Fallback): Supabase bazen event fırlatmadan önce redirect edebilir
      if (window.location.hash && window.location.hash.includes('type=recovery')) {
        setShowPasswordReset(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowPasswordReset(true);
      }

      const user = session?.user || null;
      setCurrentUser(user);
      if (user) {
        fetchUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (uid) => {
    const { data } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
    if (data) setUserProfile(data);
  };

  // 1.5 Bildirim Hatırlatıcı (21:00)
  useEffect(() => {
    if (notifPermission === 'granted') {
      const interval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 21 && now.getMinutes() === 0) {
          const today = new Date().toISOString().split('T')[0];
          const hasReadToday = logs && logs[today] && logs[today].length > 0;

          if (!hasReadToday) {
            new Notification("Risale-i Nur Takip", {
              body: "Bugün biraz rızıklanmak ister misin? ✨ Okumayı unutma.",
              icon: "/icon-192.png"
            });
          }
        }
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [notifPermission, logs]);

  const requestNotifPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  // 2. Data Listeners (Supabase Realtime)
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.id;

    const fetchData = async () => {
      // Kitaplar
      const { data: booksData } = await supabase.from('books').select('*').eq('user_id', userId);
      if (booksData) setMyBooks(booksData);

      // İstatistikler
      const { data: statsData } = await supabase.from('book_stats').select('*').eq('user_id', userId);
      const statsObj = {};
      if (statsData) {
        statsData.forEach(s => {
          statsObj[s.book_title] = s.count;
        });
      }
      setFinishedStats(statsObj);

      // Loglar
      const { data: logsData } = await supabase.from('reading_logs').select('*').eq('user_id', userId).order('date', { ascending: false });
      if (logsData) {
        const logsMap = {};
        logsData.forEach(log => {
          if (!logsMap[log.date]) logsMap[log.date] = [];
          logsMap[log.date].push(log);
        });
        setLogs(logsMap);
      }
    };

    fetchData();

    // Realtime Subscriptions
    const channels = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'books', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMyBooks(prev => {
              if (prev.find(b => b.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
          else if (payload.eventType === 'DELETE') setMyBooks(prev => prev.filter(b => b.id !== payload.old.id));
          else if (payload.eventType === 'UPDATE') setMyBooks(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'book_stats', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.new) {
            setFinishedStats(prev => ({ ...prev, [payload.new.book_title]: payload.new.count }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_logs', filter: `user_id=eq.${userId}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, [currentUser]);

  // Helpers
  const getUserId = () => currentUser?.id;

  const getBookProgress = (book) => {
    let total = 0;
    Object.values(logs).flat().forEach(log => {
      if (log.book_id === book.id) {
        let logTime = new Date(log.created_at).getTime();
        if (log.date) logTime = new Date(log.date).getTime();

        if (book.last_reset) {
          const resetTime = new Date(book.last_reset).getTime();
          if (logTime <= resetTime) return;
        }
        total += log.amount;
      }
    });
    return total;
  };

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setPagesInput('');
    setDateInput(getTodayStr());
    setReadModalOpen(true);
  };

  const handleSaveReading = async () => {
    const validation = validatePagesInput(pagesInput);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    const amount = validation.value;
    const uid = getUserId();
    if (!uid) return;

    try {
      const { data: existingLogs } = await supabase
        .from('reading_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('book_id', selectedBook.id)
        .eq('date', dateInput);

      let diff = amount;

      if (existingLogs && existingLogs.length > 0) {
        const oldLog = existingLogs[0];
        diff = amount - oldLog.amount;

        await supabase
          .from('reading_logs')
          .update({ amount: amount })
          .eq('id', oldLog.id);
      } else {
        await supabase.from('reading_logs').insert({
          user_id: uid,
          book_id: selectedBook.id,
          title: selectedBook.title,
          amount: amount,
          date: dateInput
        });
      }

      const { data: bookData } = await supabase.from('books').select('current_pages').eq('id', selectedBook.id).single();
      const newTotal = (bookData?.current_pages || 0) + diff;
      await supabase.from('books').update({ current_pages: newTotal }).eq('id', selectedBook.id);

      setReadModalOpen(false);
    } catch (error) {
      alert("Hata oluştu.");
    }
  };

  const handleFinishBook = async (e, book) => {
    e.stopPropagation();
    if (!window.confirm(`${book.title} kitabını bitirdiğini onaylıyor musun? Sayaç sıfırlanacak.`)) return;
    const uid = getUserId();

    try {
      const { data: existingStat } = await supabase.from('book_stats').select('*').eq('user_id', uid).eq('book_title', book.title).maybeSingle();
      const currentCount = existingStat ? existingStat.count : 0;

      if (existingStat) {
        await supabase.from('book_stats').update({ count: currentCount + 1 }).eq('id', existingStat.id);
      } else {
        await supabase.from('book_stats').insert({ user_id: uid, book_title: book.title, count: 1 });
      }

      await supabase.from('books').update({
        current_pages: 0,
        last_reset: new Date().toISOString()
      }).eq('id', book.id);

    } catch (error) {
      alert("Kitap bitirilemedi.");
    }
  };

  const handleAddBook = async (title) => {
    const existing = myBooks.find(b => b.title === title);
    if (existing) {
      alert("Bu kitap zaten listenizde.");
      return;
    }
    const uid = getUserId();
    if (!uid) {
      alert("Oturum hatası. Lütfen tekrar giriş yapın.");
      return;
    }

    try {
      const { data, error } = await supabase.from('books').insert({
        user_id: uid,
        title: title,
        current_pages: 0,
        added_at: new Date().toISOString()
      }).select();

      if (error) throw error;

      if (data && data.length > 0) {
        setMyBooks(prev => {
          if (prev.find(b => b.id === data[0].id)) return prev;
          return [...prev, data[0]];
        });
      }

      setAddBookModalOpen(false);
    } catch (error) {
      alert("Kitap eklenirken bir hata oluştu.");
    }
  };

  const handleRemoveBook = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Bu kitabı listenden kaldırmak istediğine emin misin?")) {
      await supabase.from('books').delete().eq('id', id);
    }
  };

  const handleLogout = async () => {
    if (window.confirm("Çıkış yapmak istediğine emin misin?")) {
      await supabase.auth.signOut();
    }
  };

  const handleUpdateName = async () => {
    const validation = validateName(newNameInput);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    try {
      const uid = currentUser.id;

      const { error: authError } = await supabase.auth.updateUser({
        data: { name: newNameInput }
      });
      if (authError) throw authError;

      const { error } = await supabase.from('users').update({ name: newNameInput }).eq('id', uid);
      if (error) throw error;
      setUserProfile(prev => ({ ...prev, name: newNameInput }));
      setEditNameModal(false);
    } catch (e) {
      alert("İsim güncellenirken hata oluştu.");
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      alert("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      alert("Şifreniz başarıyla güncellendi!");
      setShowPasswordReset(false);
      setNewPassword('');
    } catch (error) {
      alert("Şifre güncellenirken bir hata oluştu.");
    }
  };

  const handleSaveHatimCount = async () => {
    const count = parseInt(hatimCountInput);
    if (isNaN(count) || count < 0) return;
    if (count > 1000) {
      alert("Hatim sayısı 1000'den büyük olamaz");
      return;
    }
    try {
      const uid = getUserId();
      const { data: existing } = await supabase.from('book_stats').select('*').eq('user_id', uid).eq('book_title', selectedHatimBook).maybeSingle();
      if (existing) {
        await supabase.from('book_stats').update({ count }).eq('id', existing.id);
      } else {
        await supabase.from('book_stats').insert({ user_id: uid, book_title: selectedHatimBook, count });
      }
      setEditHatimModal(false);
    } catch (error) {
      alert("Hatim güncellenirken hata oluştu.");
    }
  };

  if (loadingAuth) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Yükleniyor...</div>;

  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div className="mobile-wrapper">
      <div className="content">
        {activeTab === 'home' && (
          <HomeView
            books={myBooks}
            finishedStats={finishedStats}
            logs={logs}
            getBookProgress={getBookProgress}
            onBookClick={handleBookClick}
            onFinish={handleFinishBook}
            onRemove={handleRemoveBook}
            onAddClick={() => setAddBookModalOpen(true)}
          />
        )}
        {activeTab === 'calendar' && <CalendarView logs={logs} />}
        {activeTab === 'friends' && <FriendsView userId={currentUser.id} />}
        {activeTab === 'profile' && (
          showHatimler ? (
            <HatimlerView finishedStats={finishedStats} onBack={() => setShowHatimler(false)} onEdit={async (book) => {
              setSelectedHatimBook(book);
              setHatimCountInput(String(finishedStats[book] || 0));
              setEditHatimModal(true);
            }} />
          ) : (
            <ProfileView
              finishedStats={finishedStats}
              onShowHatimler={() => setShowHatimler(true)}
              publicId={userProfile?.public_id || '...'}
              name={userProfile?.name || 'Misafir'}
              onLogout={handleLogout}
              requestNotifPermission={requestNotifPermission}
              notifPermission={notifPermission}
              onEditName={() => {
                setNewNameInput(userProfile?.name || '');
                setEditNameModal(true);
              }}
            />
          )
        )}
      </div>

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Modals */}
      <EditNameModal
        isOpen={editNameModal}
        onClose={() => setEditNameModal(false)}
        newNameInput={newNameInput}
        setNewNameInput={setNewNameInput}
        onSave={handleUpdateName}
      />

      <ReadModal
        isOpen={readModalOpen}
        onClose={() => setReadModalOpen(false)}
        selectedBook={selectedBook}
        pagesInput={pagesInput}
        setPagesInput={setPagesInput}
        dateInput={dateInput}
        setDateInput={setDateInput}
        onSave={handleSaveReading}
      />

      <AddBookModal
        isOpen={addBookModalOpen}
        onClose={() => setAddBookModalOpen(false)}
        onAddBook={handleAddBook}
      />

      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSave={handleUpdatePassword}
      />

      <HatimEditModal
        isOpen={editHatimModal}
        onClose={() => setEditHatimModal(false)}
        selectedHatimBook={selectedHatimBook}
        hatimCountInput={hatimCountInput}
        setHatimCountInput={setHatimCountInput}
        onSave={handleSaveHatimCount}
      />
    </div>
  );
}
