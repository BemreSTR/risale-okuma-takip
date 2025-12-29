import { useState, useEffect } from 'react';
import { Home, Calendar, Users, User, Plus, X, ChevronRight, BookOpen, CheckCircle, Trash2 } from 'lucide-react';
import './index.css';
import { db } from './firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot, query, where, deleteDoc, getDocs, setDoc, increment, orderBy } from 'firebase/firestore';

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

// Sabit kullanıcı ID'si (Normalde Auth ile gelir)
const USER_ID = "TR99X123";

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // State
  const [myBooks, setMyBooks] = useState([]);
  const [finishedStats, setFinishedStats] = useState({});
  const [logs, setLogs] = useState({});

  // UI States
  const [readModalOpen, setReadModalOpen] = useState(false);
  const [addBookModalOpen, setAddBookModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pagesInput, setPagesInput] = useState('');
  const [dateInput, setDateInput] = useState('');

  // Firebase Listeners
  useEffect(() => {
    // 1. Kitapları Dinle
    const qBooks = query(collection(db, "users", USER_ID, "books"));
    const unsubBooks = onSnapshot(qBooks, (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyBooks(booksData);
    });

    // 2. İstatistikleri Dinle (Bitirilen Kitaplar)
    const docRefStats = doc(db, "users", USER_ID, "stats", "general");
    const unsubStats = onSnapshot(docRefStats, (doc) => {
      if (doc.exists()) {
        setFinishedStats(doc.data());
      } else {
        setFinishedStats({});
      }
    });

    // 3. Okuma Kayıtlarını Dinle (Son 3 ay çekilebilir, şimdilik hepsi)
    const qLogs = query(collection(db, "users", USER_ID, "reading_logs"), orderBy("date", "desc"));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
      const logsData = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!logsData[data.date]) logsData[data.date] = [];
        logsData[data.date].push(data);
      });
      setLogs(logsData);
    });

    return () => {
      unsubBooks();
      unsubStats();
      unsubLogs();
    };
  }, []);

  // Helpers
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Kitabın güncel sayfa sayısını loglardan hesapla
  // Eğer kitabın lastReset tarihi varsa, o tarihten sonraki logları topla
  const getBookProgress = (book) => {
    let total = 0;
    Object.values(logs).flat().forEach(log => {
      if (log.bookId === book.id) {
        // Log zamanı ve Reset zamanı kontrolü
        // Firestore timestamp objesi {seconds: ..., nanoseconds: ...} olarak gelir
        // Localde oluşturulanlar Date objesi olabilir. Hepsini milisaniyeye çevirip kıyaslayalım.

        let logTime = 0;
        if (log.timestamp?.toDate) logTime = log.timestamp.toDate().getTime();
        else if (log.timestamp?.seconds) logTime = log.timestamp.seconds * 1000; // Timestamp objesi
        else if (log.timestamp instanceof Date) logTime = log.timestamp.getTime();
        else if (log.timestamp) logTime = new Date(log.timestamp).getTime(); // String vs

        if (book.lastReset) {
          let resetTime = 0;
          if (book.lastReset?.toDate) resetTime = book.lastReset.toDate().getTime();
          else if (book.lastReset?.seconds) resetTime = book.lastReset.seconds * 1000;
          else if (book.lastReset instanceof Date) resetTime = book.lastReset.getTime();
          else if (book.lastReset) resetTime = new Date(book.lastReset).getTime();

          if (logTime <= resetTime) return; // Sıfırlamadan önceki logları dahil etme
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

    try {
      // 1. Kitabın sayfa sayısını cache olarak güncelle (Opsiyonel ama iyi olur)
      // Artık UI buradan okumuyor ama veritabanında dursun.
      const bookRef = doc(db, "users", USER_ID, "books", selectedBook.id);
      await updateDoc(bookRef, {
        currentPages: increment(amount)
      });

      // 2. Log Ekle veya Güncelle
      const logsRef = collection(db, "users", USER_ID, "reading_logs");
      const q = query(
        logsRef,
        where("date", "==", dateInput),
        where("bookId", "==", selectedBook.id)
      );

      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const logDoc = querySnapshot.docs[0];
        const logRef = doc(db, "users", USER_ID, "reading_logs", logDoc.id);
        await updateDoc(logRef, {
          amount: increment(amount),
          timestamp: new Date()
        });
      } else {
        await addDoc(logsRef, {
          bookId: selectedBook.id,
          title: selectedBook.title,
          amount: amount,
          date: dateInput,
          timestamp: new Date()
        });
      }

      setReadModalOpen(false);
    } catch (error) {
      console.error("Okuma kaydedilirken hata:", error);
      alert("Hata oluştu, tekrar deneyin.");
    }
  };

  const handleFinishBook = async (e, book) => {
    e.stopPropagation();
    if (!window.confirm(`${book.title} kitabını bitirdiğini onaylıyor musun? Sayaç sıfırlanacak ve hatim sayına eklenecek.`)) return;

    try {
      // 1. İstatistik güncelle (Hatim sayısını artır)
      const statsRef = doc(db, "users", USER_ID, "stats", "general");
      // Belge yoksa setDoc merge ile oluşturur, varsa update eder gibi çalışır ama increment için setDoc merge gerekli olabilir yada önce get.
      // Firestore increment undefined fieldda çalışır ve field oluşturur.
      await setDoc(statsRef, {
        [book.title]: increment(1)
      }, { merge: true });

      // 2. Kitabı sıfırla (lastReset ekleyerek)
      const bookRef = doc(db, "users", USER_ID, "books", book.id);
      await updateDoc(bookRef, {
        currentPages: 0,
        lastReset: new Date()
      });

    } catch (error) {
      console.error("Kitap bitirme hatası:", error);
    }
  };

  const handleAddBook = async (title) => {
    const existing = myBooks.find(b => b.title === title);
    if (existing) {
      alert("Bu kitap zaten listenizde.");
      return;
    }

    try {
      await addDoc(collection(db, "users", USER_ID, "books"), {
        title: title,
        currentPages: 0,
        addedAt: new Date()
      });
      setAddBookModalOpen(false);
    } catch (error) {
      console.error("Kitap ekleme hatası:", error);
    }
  };

  const handleRemoveBook = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Bu kitabı listenden kaldırmak istediğine emin misin?")) {
      try {
        await deleteDoc(doc(db, "users", USER_ID, "books", id));
      } catch (error) {
        console.error("Silme hatası:", error);
      }
    }
  }

  return (
    <div className="mobile-wrapper">
      <div className="content">
        {activeTab === 'home' && (
          <HomeView
            books={myBooks}
            finishedStats={finishedStats}
            onBookClick={handleBookClick}
            onFinish={handleFinishBook}
            onRemove={handleRemoveBook}
            onAddClick={() => setAddBookModalOpen(true)}
          />
        )}
        {activeTab === 'calendar' && <CalendarView logs={logs} />}
        {activeTab === 'friends' && <FriendsView />}
        {activeTab === 'profile' && <ProfileView finishedStats={finishedStats} />}
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

    </div>
  );
}

function HomeView({ books, onBookClick, onFinish, onRemove, onAddClick, finishedStats }) {
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
          <BookOpen size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
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
                      {book.currentPages} <span style={{ fontSize: '12px', fontWeight: 'normal' }}>sayfa</span>
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

function FriendsView() {
  // Mock arkadaşlar listesi (Test için ID'yi "TR99X1" yaptık ki veri görebilelim)
  const [friends, setFriends] = useState([
    { id: USER_ID, name: 'Kendim (Test)', lastReading: 'Demin okudu', active: true },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [selectedFriend, setSelectedFriend] = useState(null);

  const handleAddFriend = () => {
    if (!idInput) return;
    setFriends([...friends, { id: idInput, name: `Kullanıcı ${idInput}`, lastReading: 'Henüz okumadı', active: false }]);
    setIdInput('');
    setShowAdd(false);
  };

  if (selectedFriend) {
    return <FriendDetailView friend={selectedFriend} onBack={() => setSelectedFriend(null)} />;
  }

  return (
    <div>
      <div className="header-row">
        <h1>Talebeler / Arkadaşlar</h1>
        <button onClick={() => setShowAdd(true)} style={{ color: 'var(--primary-color)', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Plus size={16} /> Ekle
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ animation: 'slideUp 0.2s' }}>
          <div style={{ marginBottom: '8px', fontWeight: '500' }}>Kullanıcı ID Giriniz:</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              style={{ margin: 0, padding: '8px', fontSize: '14px' }}
              placeholder="örn: TR42X1"
              value={idInput}
              onChange={e => setIdInput(e.target.value)}
            />
            <button className="btn-primary" style={{ width: 'auto', padding: '0 16px' }} onClick={handleAddFriend}>Ekle</button>
          </div>
        </div>
      )}

      {friends.map((friend) => (
        <div key={friend.id} className="card" onClick={() => setSelectedFriend(friend)} style={{ cursor: 'pointer' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b'
          }}>
            {friend.name.substring(0, 1)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600' }}>{friend.name}</div>
            <div style={{ fontSize: '12px', color: friend.active ? 'var(--primary-color)' : '#94a3b8' }}>
              {friend.lastReading}
            </div>
          </div>
          <ChevronRight size={20} color="#cbd5e1" />
        </div>
      ))}
    </div>
  );
}

function FriendDetailView({ friend, onBack }) {
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Arkadaşın loglarını çek
    const qLogs = query(collection(db, "users", friend.id, "reading_logs"), orderBy("date", "desc"));
    const unsub = onSnapshot(qLogs, (snapshot) => {
      const logsData = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (!logsData[data.date]) logsData[data.date] = [];
        logsData[data.date].push(data);
      });
      setLogs(logsData);
      setLoading(false);
    });
    return () => unsub();
  }, [friend.id]);

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

function ProfileView({ finishedStats }) {
  return (
    <div>
      <h1>Profil</h1>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
        <div style={{
          width: '80px', height: '80px', borderRadius: '50%', background: '#f0fdf4',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
          color: '#15803d'
        }}>
          <User size={40} />
        </div>
        <h2 style={{ marginBottom: '4px' }}>Misafir Okuyucu</h2>
        <div style={{
          marginTop: '16px', background: '#f8fafc', padding: '12px 24px', borderRadius: '12px',
          border: '2px dashed #cbd5e1', textAlign: 'center', cursor: 'pointer', position: 'relative'
        }} onClick={() => { navigator.clipboard.writeText(USER_ID); alert("Kopyalandı: " + USER_ID); }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>KULLANICI ID</div>
          <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-primary)' }}>{USER_ID}</div>
        </div>
      </div>

      <h3>Başarılar (Hatimler)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {Object.entries(finishedStats).length === 0 ? (
          <div style={{ gridColumn: 'span 2', color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '16px' }}>Henüz bitirilen kitap yok.</div>
        ) : Object.entries(finishedStats).map(([title, count]) => (
          <div key={title} className="card" style={{ flexDirection: 'column', gap: '4px', alignItems: 'flex-start', marginBottom: 0 }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Bitirilen</span>
            <span style={{ fontWeight: '600' }}>{title}</span>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{count} <span style={{ fontSize: '12px' }}>defa</span></div>
          </div>
        ))}
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
