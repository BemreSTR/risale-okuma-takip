import { useState } from 'react';
import { Home, Calendar, Users, User, Plus, X, ChevronRight, BookOpen, TrendingUp, Settings, LogOut, Moon, Bell } from 'lucide-react';
import './index.css';

// Mock Data
const INITIAL_BOOKS = [
  { id: 1, title: 'Sözler', totalPages: 750, readPages: 145, color: 'var(--primary-color)' },
  { id: 2, title: 'Mektubat', totalPages: 550, readPages: 45, color: 'var(--secondary-color)' },
  { id: 3, title: 'Lemalar', totalPages: 400, readPages: 310, color: '#6366f1' }, // Indigo
  { id: 4, title: 'Şualar', totalPages: 600, readPages: 20, color: '#ec4899' }, // Pink
];

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [books, setBooks] = useState(INITIAL_BOOKS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [pagesInput, setPagesInput] = useState('');

  const handleBookClick = (book) => {
    setSelectedBook(book);
    setPagesInput('');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!pagesInput || isNaN(pagesInput)) return;
    const pages = parseInt(pagesInput);
    
    setBooks(books.map(b => {
      if (b.id === selectedBook.id) {
        const newPages = Math.min(b.totalPages, b.readPages + pages);
        return { ...b, readPages: newPages };
      }
      return b;
    }));
    setModalOpen(false);
  };

  return (
    <div className="mobile-wrapper">
      <div className="content">
        {activeTab === 'home' && (
          <HomeView books={books} onBookClick={handleBookClick} />
        )}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'friends' && <FriendsView />}
        {activeTab === 'profile' && <ProfileView />}
      </div>

      <NavBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'home' && (
         <button className="fab" onClick={() => {
           // Default to first book or select a book modal
           // For now, let's open modal for first book as quick action
           handleBookClick(books[0]);
         }}>
           <Plus size={24} />
         </button>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="header-row">
              <h3>Okuma Ekle</h3>
              <button onClick={() => setModalOpen(false)}><X size={20} color="#64748b" /></button>
            </div>
            <p style={{color: '#64748b', marginBottom: '24px'}}>
              <span style={{fontWeight:600, color: 'var(--primary-color)'}}>
                {selectedBook?.title}
              </span> kitabından bugün kaç sayfa okudun?
            </p>
            
            <input 
              type="number" 
              value={pagesInput}
              onChange={e => setPagesInput(e.target.value)}
              placeholder="0" 
              autoFocus
            />
            
            <button className="btn-primary" onClick={handleSave}>
              Kaydet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function HomeView({ books, onBookClick }) {
  return (
    <div>
      <div className="header-row">
        <h1>Okuduklarım</h1>
        <div style={{background: 'white', padding: '8px', borderRadius: '50%', boxShadow: 'var(--shadow)'}}>
           <BookOpen size={20} color="var(--primary-color)" />
        </div>
      </div>
      
      <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
        {books.map(book => {
          const percent = Math.round((book.readPages / book.totalPages) * 100);
          return (
            <div key={book.id} className="card" onClick={() => onBookClick(book)} style={{cursor: 'pointer'}}>
              <div style={{
                width: '48px', height: '64px', 
                background: book.color, borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 'bold', fontSize: '10px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {book.title.substring(0, 1)}
              </div>
              
              <div style={{flex: 1}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                  <h3 style={{fontSize: '16px'}}>{book.title}</h3>
                  <span style={{fontSize: '12px', fontWeight: '600', color: book.color}}>{percent}%</span>
                </div>
                
                <div className="progress-bg">
                  <div className="progress-fill" style={{width: `${percent}%`, background: book.color}}></div>
                </div>
                
                <div style={{marginTop: '8px', fontSize: '12px', color: '#94a3b8'}}>
                   {book.readPages} / {book.totalPages} sayfa
                </div>
              </div>
              
              <ChevronRight size={20} color="#cbd5e1" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarView() {
  return (
    <div>
      <h1>Takvim</h1>
      <div className="card" style={{display: 'block'}}>
         {/* Simple Calendar Mock */}
         <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '16px'}}>
           {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(d => (
             <div key={d} style={{fontSize: '12px', color: '#94a3b8'}}>{d}</div>
           ))}
           {Array.from({length: 30}).map((_, i) => (
             <div key={i} style={{
               height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
               borderRadius: '50%',
               background: i === 15 ? 'var(--primary-color)' : (i % 5 === 0 ? '#e0f2fe' : 'transparent'),
               color: i === 15 ? 'white' : '#1e293b',
               fontSize: '14px',
               fontWeight: i === 15 ? 'bold' : 'normal'
             }}>
               {i + 1}
             </div>
           ))}
         </div>
         <div style={{borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{color: '#64748b'}}>Bu Ay Toplam</span>
            <span style={{fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)'}}>120 Sayfa</span>
         </div>
      </div>
      
      <h3>Geçmiş Okumalar</h3>
      <div className="card">
        <div style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
           <div style={{background: '#f0fdf4', padding: '8px', borderRadius: '8px'}}>
             <TrendingUp size={20} color="#16a34a" />
           </div>
           <div>
             <div style={{fontWeight: '600'}}>Lemalar</div>
             <div style={{fontSize: '12px', color: '#64748b'}}>Dün, 45 sayfa</div>
           </div>
        </div>
      </div>
    </div>
  );
}

function FriendsView() {
  return (
    <div>
       <div className="header-row">
        <h1>Arkadaşlar</h1>
        <button style={{color: 'var(--primary-color)', fontWeight: '600', fontSize: '14px'}}>+ Ekle</button>
      </div>
      
      <div style={{marginBottom: '16px'}}>
        <input type="text" placeholder="Arkadaş ara..." style={{margin: 0, padding: '12px', fontSize: '14px'}} />
      </div>
      
      {[
        {name: 'Ahmet Yılmaz', status: 'Bugün okudu', time: '2s önce', active: true},
        {name: 'Mehmet Demir', status: 'Dün okudu', time: '1g önce', active: false},
        {name: 'Ali Can', status: 'Okuyor...', time: 'Şimdi', active: true}
      ].map((friend, i) => (
        <div key={i} className="card">
           <div style={{
             width: '40px', height: '40px', borderRadius: '50%', background: '#e2e8f0',
             display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748b'
           }}>
             {friend.name.substring(0, 1)}
           </div>
           <div style={{flex: 1}}>
             <div style={{fontWeight: '600'}}>{friend.name}</div>
             <div style={{fontSize: '12px', color: friend.active ? 'var(--primary-color)' : '#94a3b8'}}>
               {friend.status}
             </div>
           </div>
           <span style={{fontSize: '12px', color: '#cbd5e1'}}>{friend.time}</span>
        </div>
      ))}
    </div>
  );
}

function ProfileView() {
  return (
    <div>
      <h1>Profil</h1>
      <div className="card" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px'}}>
         <div style={{
           width: '80px', height: '80px', borderRadius: '50%', background: '#ccfbf1',
           display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
           color: 'var(--primary-dark)'
         }}>
           <User size={40} />
         </div>
         <h2 style={{marginBottom: '4px'}}>Emre B.</h2>
         <div style={{fontSize: '14px', color: '#64748b'}}>emre@example.com</div>
         
         <div style={{
           marginTop: '24px', background: '#f8fafc', padding: '16px 32px', borderRadius: '12px',
           border: '2px dashed #cbd5e1', textAlign: 'center'
         }}>
           <div style={{fontSize: '12px', color: '#64748b', marginBottom: '4px'}}>ARKADAŞ KODUN</div>
           <div style={{fontSize: '24px', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-primary)'}}>TR42X1</div>
         </div>
      </div>
      
      <div className="card" style={{display: 'block', padding: '0'}}>
        <SettingItem icon={<Bell size={20} />} label="Bildirimler" />
        <SettingItem icon={<Moon size={20} />} label="Karanlık Mod" />
        <SettingItem icon={<Settings size={20} />} label="Ayarlar"  />
        <div style={{borderTop: '1px solid #f1f5f9'}}>
           <SettingItem icon={<LogOut size={20} color="#ef4444" />} label="Çıkış Yap" color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function SettingItem({ icon, label, color = 'var(--text-primary)' }) {
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', cursor: 'pointer'}}>
      <div style={{color: '#94a3b8'}}>{icon}</div>
      <div style={{flex: 1, fontWeight: '500', color}}>{label}</div>
      <ChevronRight size={16} color="#e2e8f0" />
    </div>
  );
}

function NavBar({ activeTab, setActiveTab }) {
  return (
    <div className="nav-bar">
      <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="Ana Sayfa" />
      <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={24} />} label="Takvim" />
      <NavButton active={activeTab === 'friends'} onClick={() => setActiveTab('friends')} icon={<Users size={24} />} label="Arkadaşlar" />
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
