import { useState, useEffect } from 'react';
import { Home, Calendar, Users, User, Plus, X, ChevronRight, BookOpen, CheckCircle, Trash2, Settings2, Pencil } from 'lucide-react';
import './index.css';
import { auth } from './firebase';
import { supabase } from './supabase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'firebase/auth';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Mail, Lock, User as UserIcon, ArrowRight, Loader2, Info, Eye, EyeOff, Bell, BellOff } from 'lucide-react';

// Risale-i Nur Külliyatı (14 Temel Kitap)
const RISALE_BOOKS = [
  'Sözler', 'Mektubat', 'Lemalar', 'Şualar',
  'Asa-yı Musa', 'Barla Lahikası', 'Kastamonu Lahikası', 'Emirdağ Lahikası',
  'Tarihçe-i Hayat', 'İşaratü\'l İ\'caz', 'Mesnevi-i Nuriye',
  'Sikke-i Tasdik-i Gaybi', 'Muhakemat', 'İman ve Küfür Muvazeneleri'
];

const COLORS = [
  '#0d9488', '#ec4899', '#6366f1', '#f59e0b', '#8b5cf6', '#10b981', '#3b82f6'
];

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // { publicId, name, ... }
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
  const [selectedBook, setSelectedBook] = useState(null);
  const [pagesInput, setPagesInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const { data } = await supabase.from('users').select('*').eq('id', user.uid).maybeSingle();
        if (data) setUserProfile(data);
      } else {
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => unsub();
  }, []);

  // 1.5 Bildirim Hatırlatıcı (21:00)
  useEffect(() => {
    if (notifPermission === 'granted') {
      const interval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 21 && now.getMinutes() === 0) {
          const today = new Date().toISOString().split('T')[0];
          // Bugün için log var mı kontrol et
          const hasReadToday = logs && logs[today] && logs[today].length > 0;

          if (!hasReadToday) {
            new Notification("Risale-i Nur Takip", {
              body: "Bugün biraz rızıklanmak ister misin? ✨ Okumayı unutma.",
              icon: "/icon-192.png"
            });
          }
        }
      }, 60000); // Her dakika kontrol et
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

    const userId = currentUser.uid;

    const fetchData = async () => {
      // Kitaplar
      const { data: booksData } = await supabase.from('books').select('*').eq('user_id', userId);
      if (booksData) setMyBooks(booksData);

      // İstatistikler (book_counts tablosunda tutuyoruz)
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
          if (payload.eventType === 'INSERT') setMyBooks(prev => [...prev, payload.new]);
          else if (payload.eventType === 'DELETE') setMyBooks(prev => prev.filter(b => b.id !== payload.old.id));
          else if (payload.eventType === 'UPDATE') setMyBooks(prev => prev.map(b => b.id === payload.new.id ? payload.new : b));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'book_stats', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Basitçe yeniden çekmek daha güvenli olabilir ama manuel update edelim
          if (payload.new) {
            setFinishedStats(prev => ({ ...prev, [payload.new.book_title]: payload.new.count }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reading_logs', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Loglar karmaşık, yeniden çekelim veya state'i güncelleyelim.
          // Basitlik için yeniden çekiyoruz (fetchData fonksiyonunu useEffect dışına almak gerekirdi ama burada duplicate edelim ya da basit reload)
          // State update:
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channels);
    };
  }, [currentUser]);

  // Helpers
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getUserId = () => currentUser?.uid;

  const getBookProgress = (book) => {
    let total = 0;
    Object.values(logs).flat().forEach(log => {
      if (log.book_id === book.id) { // bookId -> book_id (snake_case)
        let logTime = new Date(log.created_at).getTime(); // timestamp -> created_at
        if (log.date) logTime = new Date(log.date).getTime();

        if (book.last_reset) { // lastReset -> last_reset
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
    if (!pagesInput || isNaN(pagesInput)) return;
    const amount = parseInt(pagesInput);
    if (amount <= 0) return;
    const uid = getUserId();
    if (!uid) return;

    try {
      // 1. Kitap Sayfasını Güncelle
      // Supabase'de increment fonksiyonu SQL ile yapılabilir ama burada önce okuyup sonra yazacağız ya da RPC kullanacağız.
      // Basitlik için: RPC kullanmıyoruz, log ekleyeceğiz.
      // UI zaten loglardan hesaplıyor, bu yüzden 'current_pages' fieldini güncellemek zorunda değiliz ama cache için iyi olur.
      // 2. Kayıt Var mı Kontrol Et
      const { data: existingLogs } = await supabase
        .from('reading_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('book_id', selectedBook.id)
        .eq('date', dateInput);

      let diff = amount;

      if (existingLogs && existingLogs.length > 0) {
        // Güncelle (Üzerine Yaz)
        const oldLog = existingLogs[0];
        diff = amount - oldLog.amount; // Kitap toplam ilerlemesi için farkı hesapla

        await supabase
          .from('reading_logs')
          .update({ amount: amount }) // Üzerine Yaz (10 + 30 = 40 değil, direkt 30)
          .eq('id', oldLog.id);
      } else {
        // Yeni Ekle
        await supabase.from('reading_logs').insert({
          user_id: uid,
          book_id: selectedBook.id,
          title: selectedBook.title,
          amount: amount,
          date: dateInput
        });
      }

      // 3. Kitap Toplam İlerlemesini Güncelle
      const { data: bookData } = await supabase.from('books').select('current_pages').eq('id', selectedBook.id).single();
      const newTotal = (bookData?.current_pages || 0) + diff;
      await supabase.from('books').update({ current_pages: newTotal }).eq('id', selectedBook.id);

      setReadModalOpen(false);
    } catch (error) {
      console.error("Okuma hatası:", error);
      alert("Hata oluştu.");
    }
  };

  const handleFinishBook = async (e, book) => {
    e.stopPropagation();
    if (!window.confirm(`${book.title} kitabını bitirdiğini onaylıyor musun? Sayaç sıfırlanacak.`)) return;
    const uid = getUserId();

    try {
      // 1. İstatistik Upsert
      const { data: existingStat } = await supabase.from('book_stats').select('*').eq('user_id', uid).eq('book_title', book.title).maybeSingle();
      const currentCount = existingStat ? existingStat.count : 0;

      if (existingStat) {
        await supabase.from('book_stats').update({ count: currentCount + 1 }).eq('id', existingStat.id);
      } else {
        await supabase.from('book_stats').insert({ user_id: uid, book_title: book.title, count: 1 });
      }

      // 2. Kitabı Sıfırla
      await supabase.from('books').update({
        current_pages: 0,
        last_reset: new Date().toISOString()
      }).eq('id', book.id);

    } catch (error) {
      console.error("Bitirme hatası:", error);
    }
  };

  const handleAddBook = async (title) => {
    const existing = myBooks.find(b => b.title === title);
    if (existing) {
      alert("Bu kitap zaten listenizde.");
      return;
    }
    const uid = getUserId();
    try {
      await supabase.from('books').insert({
        user_id: uid,
        title: title,
        current_pages: 0,
        added_at: new Date().toISOString()
      });
      setAddBookModalOpen(false);
    } catch (error) {
      console.error("Ekleme hatası:", error);
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
      await signOut(auth);
      setMyBooks([]);
      setLogs({});
      setFinishedStats({});
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
        {activeTab === 'friends' && <FriendsView userId={currentUser.uid} />}
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
            />
          )
        )}
      </div>

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Okuma Ekleme Modalı */}
      {readModalOpen && (
        <div className="modal-overlay" onClick={() => setReadModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Okuma Ekle</h3>
              <button onClick={() => setReadModalOpen(false)}><X size={20} color="#64748b" /></button>
            </div>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedBook?.title}</span> kitabından kaç sayfa okudun?
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Tarih</label>
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                style={{ margin: 0, padding: '12px', fontSize: '16px', textAlign: 'left' }}
              />
            </div>

            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Sayfa Sayısı</label>
            <input
              type="number"
              value={pagesInput}
              onChange={e => setPagesInput(e.target.value)}
              placeholder="Örn: 10"
              autoFocus
              style={{ marginTop: 0 }}
            />
            <button className="btn-primary" onClick={handleSaveReading}>Kaydet</button>
          </div>
        </div>
      )}

      {/* Kitap Seçme Modalı (Kütüphane) */}
      {addBookModalOpen && (
        <div className="modal-overlay" onClick={() => setAddBookModalOpen(false)}>
          <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Kitap Seç</h3>
              <button onClick={() => setAddBookModalOpen(false)}><X size={20} color="#64748b" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {RISALE_BOOKS.map(title => (
                <button
                  key={title}
                  className="card"
                  style={{ marginBottom: 0, justifyContent: 'space-between', padding: '12px' }}
                  onClick={() => handleAddBook(title)}
                >
                  <span>{title}</span>
                  <Plus size={16} color="var(--primary-color)" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hatim Düzenleme Modalı */}
      {editHatimModal && (
        <div className="modal-overlay" onClick={() => setEditHatimModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Hatim Sayısı Düzenle</h3>
              <button onClick={() => setEditHatimModal(false)}><X size={20} color="#64748b" /></button>
            </div>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{selectedHatimBook}</span> kitabını kaç kere bitirdin?
            </p>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Hatim Sayısı</label>
            <input
              type="number"
              value={hatimCountInput}
              onChange={e => setHatimCountInput(e.target.value)}
              placeholder="0"
              min="0"
              autoFocus
              style={{ marginTop: 0 }}
            />
            <button className="btn-primary" onClick={async () => {
              const count = parseInt(hatimCountInput);
              if (isNaN(count) || count < 0) return;
              try {
                const uid = getUserId();
                // Find existing stat
                const { data: existing } = await supabase.from('book_stats').select('*').eq('user_id', uid).eq('book_title', selectedHatimBook).maybeSingle();
                if (existing) {
                  await supabase.from('book_stats').update({ count }).eq('id', existing.id);
                } else {
                  await supabase.from('book_stats').insert({ user_id: uid, book_title: selectedHatimBook, count });
                }
                setEditHatimModal(false);
              } catch (error) {
                console.error("Hatim güncelleme hatası:", error);
              }
            }}>Kaydet</button>
          </div>
        </div>
      )}

    </div>
  );
}

function AuthView() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Register Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const generatePublicId = () => {
    // TR + 4 rakam + X + 4 rakam (Örn: TR1234X5678)
    // Bu format 100.000.000 (yüz milyon) farklı kombinasyon sağlar.
    const r1 = Math.floor(Math.random() * 9000 + 1000);
    const r2 = Math.floor(Math.random() * 9000 + 1000);
    return `TR${r1}X${r2}`;
  };

  const handleRegister = async () => {
    if (!name || !email || !password) return setErrorMsg("Lütfen tüm alanları doldurunuz.");
    if (password.length < 6) return setErrorMsg("Şifre en az 6 karakter olmalı.");

    setErrorMsg('');
    setLoading(true);
    try {
      // 1. Benzersiz bir Public ID bulana kadar dene
      let publicId = "";
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 5) {
        const candidateId = generatePublicId();
        const { data } = await supabase.from('users').select('public_id').eq('public_id', candidateId).maybeSingle();
        if (!data) {
          publicId = candidateId;
          isUnique = true;
        }
        attempts++;
      }

      if (!publicId) throw new Error("ID oluşturulamadı, lütfen tekrar deneyin.");

      // 2. Firebase User Oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: name });

      // 3. Supabase Kaydı
      await supabase.from('users').insert({
        id: user.uid,
        name: name,
        email: email,
        public_id: publicId,
      });
    } catch (e) {
      console.error(e);
      let msg = "Kayıt hatası.";
      if (e.code === 'auth/email-already-in-use') msg = "Bu e-posta zaten kullanımda.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return setErrorMsg("Lütfen bilgileri giriniz.");
    setErrorMsg('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (e) {
      console.error(e);
      let msg = "Giriş yapılamadı.";
      if (e.code === 'auth/invalid-credential') msg = "Hatalı e-posta veya şifre.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    handleRegister();
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Logo & Header */}
      <div className="mb-8 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-primary/20">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Risale-i Nur Takip</h1>
          <p className="text-slate-500 text-sm">Okumak bir şeydir, ama her şey o bir şeyden çıkıyor. </p>
        </div>
      </div>

      <Card className="w-full max-w-md shadow-xl border-none animate-in fade-in zoom-in-95 duration-500 delay-200">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader className="pb-2">
            <TabsList className="grid w-full grid-cols-2 h-12">
              <TabsTrigger value="login" className="text-sm font-semibold">Giriş Yap</TabsTrigger>
              <TabsTrigger value="register" className="text-sm font-semibold">Kayıt Ol</TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4 px-8">
            {errorMsg && (
              <Alert variant="destructive" className="mb-6 animate-in slide-in-from-top-2 duration-300">
                <Info className="h-4 w-4" />
                <AlertTitle>Hata</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            <TabsContent value="login" className="space-y-4 m-0">
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">E-Posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      placeholder="ad@ornek.com"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10 h-11"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="pl-10 pr-10 h-11"
                      placeholder="••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Giriş Yap"
                  )}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 m-0">
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Ad Soyad</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      placeholder="Ahmet Yılmaz"
                      autoComplete="name"
                      required
                      className="pl-10 h-11"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">E-Posta</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      placeholder="ad@ornek.com"
                      type="email"
                      autoComplete="email"
                      required
                      className="pl-10 h-11"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Şifre</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      className="pl-10 pr-10 h-11"
                      placeholder="En az 6 karakter"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold transition-all hover:scale-[1.01]"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    "Kayıt Ol ve Takibe Başla"
                  )}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>
            </TabsContent>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2">
            <div className="w-full flex items-center justify-center gap-2">
              <Separator className="flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hizmet ve Gizlilik</span>
              <Separator className="flex-1" />
            </div>
            <p className="text-center text-[10px] text-slate-400 px-6 leading-normal">
              Kaydolarak kullanım koşullarımızı ve aydınlatma metnini kabul etmiş sayılırsınız.
              Verileriniz güvenle saklanmaktadır.
            </p>
          </CardFooter>
        </Tabs>
      </Card>

      <div className="mt-8 text-slate-400 text-[11px] animate-in fade-in duration-1000 delay-700">
        &copy; {new Date().getFullYear()} Risale-i Nur Okuma Takip Sistemi
      </div>
    </div>
  );
}

function HomeView({ books, finishedStats, logs, getBookProgress, onBookClick, onFinish, onRemove, onAddClick }) {
  return (
    <div>
      <div className="header-row">
        <h1>Okuduklarım</h1>
        {/* <div style={{background: 'white', padding: '8px', borderRadius: '50%', boxShadow: 'var(--shadow)'}}>
           <BookOpen size={20} color="var(--primary-color)" />
        </div> */}
      </div>

      {books.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p>Henüz okunacak bir kitap eklemedin.</p>
          <button className="btn-primary" style={{ marginTop: '20px' }} onClick={onAddClick}>
            Kitap Ekle
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {books.map((book, index) => {
            const color = COLORS[index % COLORS.length];
            const finishedCount = finishedStats[book.title] || 0;
            return (
              <div key={book.id} className="card" onClick={() => onBookClick(book)} style={{ cursor: 'pointer', flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>

                {/* Üst Kısım: Başlık ve İkon */}
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '54px',
                    background: color, borderRadius: '6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    {book.title.substring(0, 1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '16px', margin: 0 }}>{book.title}</h3>
                    {finishedCount > 0 && <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 600 }}>Hatim: {finishedCount}</span>}
                  </div>
                  <button onClick={(e) => onRemove(e, book.id)} style={{ padding: '8px' }}>
                    <Trash2 size={16} color="#cbd5e1" />
                  </button>
                </div>

                {/* Alt Kısım: Sayaç ve Buton */}
                <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>Şu an okunan</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {getBookProgress(book)} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>sayfa</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => onFinish(e, book)}
                    style={{
                      background: '#ecfdf5', color: '#059669',
                      padding: '8px 12px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '12px', fontWeight: '600'
                    }}>
                    <CheckCircle size={14} />
                    Bitirdim
                  </button>
                </div>
              </div>
            );
          })}
          <button className="card" onClick={onAddClick} style={{ justifyContent: 'center', color: 'var(--primary-color)', border: '2px dashed #cbd5e1', boxShadow: 'none', background: 'transparent' }}>
            + Başka Kitap Ekle
          </button>
        </div>
      )}
    </div>
  );
}

function CalendarView({ logs }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Takvim verileri
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Pazar, 1 = Ptesi...

  // Pazartesi'den başlaması için düzenleme (Pazar 0 -> 7 olsun ki 1-6 Pzt-Cmt kalsın, sonra 7 Pazar)
  // Ama JavaScript getDay(): Pazar=0, Pzt=1. Bizim dizimiz Pzt ile başlıyor (index 0).
  // Eğer gün Pzt(1) ise offset 0 olmalı. Pazar(0) ise offset 6 olmalı.
  const startingDayOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: startingDayOffset }, (_, i) => i);

  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  // Ay isimleri
  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

  const getLogForDay = (day) => {
    // Format: YYYY-MM-DD (Ay ve gün 0 dolgulu)
    const m = month + 1;
    const mStr = m < 10 ? `0${m}` : m;
    const dStr = day < 10 ? `0${day}` : day;
    const dateKey = `${year}-${mStr}-${dStr}`;
    return logs[dateKey] || [];
  };

  const selectedLog = getLogForDay(selectedDay);
  const totalPagesForSelectedDay = selectedLog.reduce((acc, curr) => acc + curr.amount, 0);

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDay(1); // Ay değişince günü 1'e sabitle
  };

  return (
    <div>
      <div className="header-row">
        <button onClick={() => changeMonth(-1)}><ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /></button>
        <h1 style={{ fontSize: '20px', margin: 0 }}>{monthNames[month]} {year}</h1>
        <button onClick={() => changeMonth(1)}><ChevronRight size={24} /></button>
      </div>

      <div className="card" style={{ display: 'block' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
            <div key={d} style={{ fontSize: '12px', color: '#94a3b8', paddingBottom: '8px' }}>{d}</div>
          ))}

          {/* Boş kutular (ayın ilk gününe kadar) */}
          {emptyDays.map(d => <div key={`empty-${d}`}></div>)}

          {days.map((day) => {
            const dayLogs = getLogForDay(day);
            const dayTotal = dayLogs.reduce((acc, c) => acc + c.amount, 0);
            const hasReading = dayTotal > 0;
            const isSelected = day === selectedDay;

            // Bugünün tarihi mi?
            const todayObj = new Date();
            const isToday = todayObj.getDate() === day && todayObj.getMonth() === month && todayObj.getFullYear() === year;

            // Renk Skalası (Yeşil ve Kırmızı Tonları)
            let bg = 'transparent';
            let text = '#1e293b';

            if (hasReading) {
              text = 'white';
              if (dayTotal < 10) {
                bg = '#a7f3d0'; // Emerald-200
                text = '#064e3b';
              }
              else if (dayTotal < 30) {
                bg = '#6ee7b7'; // Emerald-300
                text = '#064e3b';
              }
              else if (dayTotal < 50) {
                bg = '#34d399'; // Emerald-400
                text = '#064e3b';
              }
              else if (dayTotal < 80) bg = '#059669'; // Emerald-600
              else if (dayTotal < 100) bg = '#065f46'; // Emerald-800
              else if (dayTotal < 150) bg = '#7767f8ff'; // Blue-700
              else bg = '#1524cdff'; // Blue-900

            } else if (isSelected) {
              text = 'var(--primary-color)';
            }

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  aspectRatio: '1/1',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--primary-color)' : (isToday ? '1px dashed #cbd5e1' : 'none'),
                  background: bg,
                  color: text,
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s'
                }}>
                <span style={{ fontSize: '14px', fontWeight: hasReading || isSelected ? 'bold' : 'normal' }}>{day}</span>
                {hasReading && <span style={{ fontSize: '9px', opacity: 0.9 }}>{dayTotal}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <h3>{selectedDay} {monthNames[month]} Detayları</h3>
      {selectedLog.length > 0 ? (
        <div className="card" style={{ display: 'block', padding: '0', overflow: 'hidden' }}>
          {selectedLog.map((log, i) => (
            <div key={i} style={{
              padding: '16px',
              borderBottom: i !== selectedLog.length - 1 ? '1px solid #f1f5f9' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                <span style={{ fontWeight: '500' }}>{log.title}</span>
              </div>
              <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>+{log.amount} sayfa</span>
            </div>
          ))}
          <div style={{ padding: '12px', background: '#f8fafc', fontSize: '13px', color: '#64748b', textAlign: 'center', borderTop: '1px solid #e2e8f0' }}>
            Toplam: {totalPagesForSelectedDay} sayfa
          </div>
        </div>
      ) : (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          Bu tarihte okuma kaydı bulunmuyor.
        </div>
      )}
    </div>
  );
}

function FriendsView({ userId }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');

  const [showEditGroup, setShowEditGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupNameInput, setEditGroupNameInput] = useState('');

  const [activeGroupId, setActiveGroupId] = useState(null);
  const [memberIdInput, setMemberIdInput] = useState('');

  const [selectedFriend, setSelectedFriend] = useState(null);
  const [movingMember, setMovingMember] = useState(null); // { member, currentGroupId }

  useEffect(() => {
    // Grupları (ve üyeleri) çek. Supabase'de JSONB olarak tutuyoruz members'ı.
    const fetchGroups = async () => {
      const { data } = await supabase.from('following_groups').select('*').eq('user_id', userId);
      if (data) setGroups(data);
      setLoading(false);
    };

    fetchGroups();

    const channel = supabase.channel('groups')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'following_groups', filter: `user_id=eq.${userId}` },
        () => fetchGroups()
      ).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const handleAddGroup = async () => {
    if (!groupNameInput.trim()) return;
    try {
      await supabase.from('following_groups').insert({
        user_id: userId,
        name: groupNameInput,
        members: [] // JSONB array
      });
      setGroupNameInput('');
      setShowAddGroup(false);
    } catch (e) { console.error(e); }
  };

  const handleAddMember = async () => {
    if (!memberIdInput.trim()) return;
    try {
      // 1. Kullanıcıyı bul
      const { data: foundUsers } = await supabase.from('users').select('*').eq('public_id', memberIdInput.trim());

      if (!foundUsers || foundUsers.length === 0) {
        alert("Böyle bir Kullanıcı ID bulunamadı.");
        return;
      }

      const foundUser = foundUsers[0];
      const realMemberId = foundUser.id;
      const name = foundUser.name || `Öğrenci ${memberIdInput}`;

      // 2. Grubu güncelle
      // Önce mevcut grubu bulalım
      const groupidx = groups.findIndex(g => g.id === activeGroupId);
      if (groupidx === -1) return;
      const currentMembers = groups[groupidx].members || [];

      // Ekle (eğer yoksa)
      if (currentMembers.find(m => m.id === realMemberId)) {
        alert("Zaten ekli.");
        return;
      }

      const newMembers = [...currentMembers, { id: realMemberId, name }];

      await supabase.from('following_groups').update({ members: newMembers }).eq('id', activeGroupId);

      setMemberIdInput('');
      setActiveGroupId(null);
    } catch (e) {
      console.error(e);
      alert("Hata oluştu.");
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm("Bu grubu silmek istiyor musun?")) return;
    await supabase.from('following_groups').delete().eq('id', groupId);
  };

  const handleEditGroup = async () => {
    if (!editGroupNameInput.trim()) return;
    try {
      await supabase.from('following_groups').update({ name: editGroupNameInput }).eq('id', editingGroupId);
      setShowEditGroup(false);
      setEditingGroupId(null);
      setEditGroupNameInput('');
    } catch (e) {
      console.error(e);
      alert("Düzenleme hatası.");
    }
  };

  const openEditGroup = (group) => {
    setEditingGroupId(group.id);
    setEditGroupNameInput(group.name);
    setShowEditGroup(true);
  };

  const handleRemoveMember = async (groupId, member) => {
    if (!window.confirm(`${member.name} isimli kişiyi gruptan çıkarmak istiyor musun?`)) return;
    const group = groups.find(g => g.id === groupId);
    const newMembers = group.members.filter(m => m.id !== member.id);
    await supabase.from('following_groups').update({ members: newMembers }).eq('id', groupId);
  };

  const handleMoveMember = async (targetGroupId) => {
    if (!movingMember || !targetGroupId) return;
    const { member, currentGroupId } = movingMember;

    try {
      // 1. Eski gruptan çıkar
      const sourceGroup = groups.find(g => g.id === currentGroupId);
      const filteredMembers = sourceGroup.members.filter(m => m.id !== member.id);

      // 2. Yeni gruba ekle
      const targetGroup = groups.find(g => g.id === targetGroupId);
      const updatedTargetMembers = [...(targetGroup.members || []), member];

      // Paralel güncelleme (Veya sırayla)
      await Promise.all([
        supabase.from('following_groups').update({ members: filteredMembers }).eq('id', currentGroupId),
        supabase.from('following_groups').update({ members: updatedTargetMembers }).eq('id', targetGroupId)
      ]);

      setMovingMember(null);
    } catch (e) {
      console.error(e);
      alert("Taşıma hatası.");
    }
  };

  if (selectedFriend) {
    return <FriendDetailView friend={selectedFriend} onBack={() => setSelectedFriend(null)} />;
  }

  return (
    <div>
      <div className="header-row">
        <h1>Arkadaşlar</h1>
        <button onClick={() => setShowAddGroup(true)} style={{ color: 'var(--primary-color)', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={16} /> Grup Ekle
        </button>
      </div>

      {loading && <div style={{ color: '#94a3b8', textAlign: 'center' }}>Yükleniyor...</div>}

      {!loading && groups.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <p>Henüz hiç grup oluşturmadın.</p> <br />
          <button className="btn-primary" onClick={() => setShowAddGroup(true)} style={{ width: 'auto', margin: '0 auto' }}>Grup Oluştur</button>
        </div>
      )}

      {groups.map(group => (
        <div key={group.id} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '18px' }}>{group.name}</h3>
              <button onClick={() => openEditGroup(group)} style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer' }}>
                <Pencil size={14} color="#94a3b8" />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setActiveGroupId(group.id)} style={{ fontSize: '12px', background: '#e0e7ff', color: '#4338ca', padding: '4px 8px', borderRadius: '6px', border: 'none' }}>+ Talebe Ekle</button>
              <button onClick={() => handleDeleteGroup(group.id)} style={{ background: 'transparent', border: 'none', padding: 0 }}><X size={16} color="#ef4444" /></button>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {group.members && group.members.length > 0 ? (
              group.members.map(member => (
                <div key={member.id} className="card" onClick={() => setSelectedFriend(member)} style={{ cursor: 'pointer', marginBottom: 0 }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b'
                  }}>
                    {member.name.substring(0, 1)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{member.name}</div>
                    {/* Burada lastReading bilgisi yok, detayda var. */}
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={(e) => { e.stopPropagation(); setMovingMember({ member, currentGroupId: group.id }); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                      <Settings2 size={16} color="#94a3b8" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveMember(group.id, member); }} style={{ background: 'transparent', border: 'none', padding: '4px' }}>
                      <Trash2 size={16} color="#ef4444" opacity={0.5} />
                    </button>
                  </div>
                  <ChevronRight size={18} color="#cbd5e1" />
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', fontSize: '13px', color: '#94a3b8', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                Bu grupta henüz kimse yok.
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modals... */}
      {showAddGroup && (
        <div className="modal-overlay" onClick={() => setShowAddGroup(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Yeni Grup Oluştur</h3>
              <button onClick={() => setShowAddGroup(false)}><X size={20} color="#64748b" /></button>
            </div>
            <input value={groupNameInput} onChange={e => setGroupNameInput(e.target.value)} placeholder="Grup Adı (örn: Liseli Talebeler)" autoFocus />
            <button className="btn-primary" onClick={handleAddGroup}>Oluştur</button>
          </div>
        </div>
      )}

      {showEditGroup && (
        <div className="modal-overlay" onClick={() => { setShowEditGroup(false); setEditingGroupId(null); setEditGroupNameInput(''); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Grubu Düzenle</h3>
              <button onClick={() => { setShowEditGroup(false); setEditingGroupId(null); setEditGroupNameInput(''); }}><X size={20} color="#64748b" /></button>
            </div>
            <input value={editGroupNameInput} onChange={e => setEditGroupNameInput(e.target.value)} placeholder="Grup Adı" autoFocus />
            <button className="btn-primary" onClick={handleEditGroup}>Kaydet</button>
          </div>
        </div>
      )}

      {activeGroupId && (
        <div className="modal-overlay" onClick={() => setActiveGroupId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Talebe Ekle</h3>
              <button onClick={() => setActiveGroupId(null)}><X size={20} color="#64748b" /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>Eklemek istediğin kişinin Kullanıcı ID'sini gir.</p>
            <input value={memberIdInput} onChange={e => setMemberIdInput(e.target.value)} placeholder="Talebe ID (örn: TR9923X1232)" autoFocus />
            <button className="btn-primary" onClick={handleAddMember}>Ekle</button>
          </div>
        </div>
      )}

      {movingMember && (
        <div className="modal-overlay" onClick={() => setMovingMember(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Grubu Değiştir</h3>
              <button onClick={() => setMovingMember(null)}><X size={20} color="#64748b" /></button>
            </div>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              <strong>{movingMember.member.name}</strong> isimli kişiyi hangi gruba taşımak istiyorsun?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {groups.filter(g => g.id !== movingMember.currentGroupId).length > 0 ? (
                groups.filter(g => g.id !== movingMember.currentGroupId).map(group => (
                  <button
                    key={group.id}
                    onClick={() => handleMoveMember(group.id)}
                    style={{
                      textAlign: 'left', padding: '12px', borderRadius: '12px',
                      background: '#f1f5f9', border: '1px solid #e2e8f0',
                      fontWeight: '500', color: '#1e293b'
                    }}
                  >
                    {group.name}
                  </button>
                ))
              ) : (
                <p style={{ fontSize: '12px', color: '#ef4444', textAlign: 'center' }}>Taşıyabileceğin başka bir grup bulunmuyor.</p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function FriendDetailView({ friend, onBack }) {
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriendLogs = async () => {
      // Friend ID aslında Supabase User ID (Auth ID)
      // Logları çek
      const { data } = await supabase.from('reading_logs').select('*').eq('user_id', friend.id);

      if (data) {
        const logsMap = {};
        data.forEach(log => {
          const d = log.date;
          if (!logsMap[d]) logsMap[d] = [];
          logsMap[d].push(log); // log.amount, log.title
        });
        setLogs(logsMap);
      }
      setLoading(false);
    };
    fetchFriendLogs();
  }, [friend]);

  return (
    <div>
      <div className="header-row">
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /> Geri
        </button>
        <h3 style={{ margin: 0 }}>{friend.name}</h3>
        <div style={{ width: 24 }}></div> {/* Spacer to center title */}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Yükleniyor...</div>
      ) : (
        <CalendarView logs={logs} />
      )}
    </div>
  );
}

function ProfileView({ finishedStats, onShowHatimler, publicId, name, onLogout, requestNotifPermission, notifPermission }) {
  const hatimCount = Math.min(...RISALE_BOOKS.map(title => finishedStats[title] || 0));
  return (
    <div>
      <div className="header-row">
        <h1>Profil</h1>
        <button onClick={onLogout} style={{ fontSize: '12px', color: '#ef4444', fontWeight: '600', background: 'transparent', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fee2e2' }}>
          Çıkış Yap
        </button>
      </div>

      <div className="card" style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '16px',
          fontSize: '32px', fontWeight: 'bold'
        }}>
          {name ? name.substring(0, 2).toUpperCase() : '??'}
        </div>
        <h2 style={{ fontSize: '20px', margin: '0 0 4px 0' }}>{name}</h2>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Risale-i Nur Okuyucusu</p>

        <div style={{
          marginTop: '16px', background: '#f8fafc', padding: '12px 24px', borderRadius: '12px',
          border: '2px dashed #cbd5e1', textAlign: 'center', cursor: 'pointer', position: 'relative'
        }} onClick={() => { navigator.clipboard.writeText(publicId); alert("Kopyalandı: " + publicId); }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>KULLANICI ID (kopyala)</div>
          <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-primary)' }}>{publicId}</div>
        </div>
      </div>

      {/* Bildirim Hatırlatıcısı Kartı */}
      <div className="card" style={{ justifyContent: 'space-between', alignItems: 'center', background: notifPermission === 'granted' ? '#f0fdf4' : '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: notifPermission === 'granted' ? '#22c55e' : '#f1f5f9', color: notifPermission === 'granted' ? 'white' : '#64748b', padding: '10px', borderRadius: '12px' }}>
            {notifPermission === 'granted' ? <Bell size={20} /> : <BellOff size={20} />}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Akşam Hatırlatması</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Saat 21:00'de okuma uyarısı</div>
          </div>
        </div>
        {notifPermission !== 'granted' ? (
          <button onClick={requestNotifPermission} className="btn-primary" style={{ padding: '8px 16px', fontSize: '12px', width: 'auto' }}>
            Aç
          </button>
        ) : (
          <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 'bold' }}>AÇIK</span>
        )}
      </div>

      <div className="card" onClick={onShowHatimler} style={{ cursor: 'pointer', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>Toplam Hatim</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{hatimCount} <span style={{ fontSize: '12px' }}>hatim</span></div>
        </div>
        <ChevronRight size={24} color="#cbd5e1" />
      </div>
    </div>
  );
}

function HatimlerView({ finishedStats, onBack, onEdit }) {
  return (
    <div>
      <div className="header-row">
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
          <ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /> Geri
        </button>
        <h1 style={{ margin: 0 }}>Hatimler</h1>
        <div style={{ width: 24 }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {RISALE_BOOKS.map((bookTitle, index) => {
          const count = finishedStats[bookTitle] || 0;
          const color = COLORS[index % COLORS.length];
          return (
            <div
              key={bookTitle}
              className="card"
              onClick={() => onEdit(bookTitle)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{
                width: '40px', height: '54px',
                background: color, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                {bookTitle.substring(0, 1)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600' }}>{bookTitle}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Bitirme sayısı</div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {count}
              </div>
              <ChevronRight size={20} color="#cbd5e1" style={{ marginLeft: '8px' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NavBar({ activeTab, setActiveTab }) {
  // ... NavBar aynı kalabilir ...
  return (
    <div className="nav-bar">
      <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="Okuduklarım" />
      <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={24} />} label="Takvim" />
      <NavButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users size={24} />} label="Takip" />
      <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={24} />} label="Profil" />
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="nav-icon">{icon}</div>
      <span>{label}</span>
    </button>
  );
}
