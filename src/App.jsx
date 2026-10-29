import { useState, useEffect } from 'react'
import './index.css'
import { auth, db } from './firebase'
import {
  onAuthStateChanged,
  signOut,
  updateProfile,
  updatePassword
} from 'firebase/auth'
import {
  collection,
  doc,
  query,
  where,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  limit
} from 'firebase/firestore'
import { validatePagesInput, validateName, getTodayStr } from './utils/helpers'

// Pages
import AuthView from './pages/AuthView'
import HomeView from './pages/HomeView'
import CalendarView from './pages/CalendarView'
import FriendsView from './pages/FriendsView'
import ProfileView from './pages/ProfileView'
import HatimlerView from './pages/HatimlerView'

// Components
import NavBar from './components/NavBar'
import ReadModal from './components/modals/ReadModal'
import AddBookModal from './components/modals/AddBookModal'
import EditNameModal from './components/modals/EditNameModal'
import PasswordResetModal from './components/modals/PasswordResetModal'
import HatimEditModal from './components/modals/HatimEditModal'

export default function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // App State
  const [activeTab, setActiveTab] = useState('home')
  const [showHatimler, setShowHatimler] = useState(false)
  const [editHatimModal, setEditHatimModal] = useState(false)
  const [selectedHatimBook, setSelectedHatimBook] = useState(null)
  const [hatimCountInput, setHatimCountInput] = useState('')

  // Data
  const [myBooks, setMyBooks] = useState([])
  const [finishedStats, setFinishedStats] = useState({})
  const [logs, setLogs] = useState({})

  // UI States
  const [readModalOpen, setReadModalOpen] = useState(false)
  const [addBookModalOpen, setAddBookModalOpen] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [pagesInput, setPagesInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [notifPermission, setNotifPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default')
  const [editNameModal, setEditNameModal] = useState(false)
  const [newNameInput, setNewNameInput] = useState('')

  // Fetch User Profile
  const fetchUserProfile = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        setUserProfile(userDoc.data())
      }
    } catch (err) {
      console.error('Kullanıcı profili alınamadı:', err)
    }
  }

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        await fetchUserProfile(user.uid)
      } else {
        setUserProfile(null)
        setMyBooks([])
        setFinishedStats({})
        setLogs({})
      }
      setLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [])

  // 1.5 Bildirim Hatırlatıcı (21:00)
  useEffect(() => {
    if (notifPermission === 'granted') {
      const interval = setInterval(() => {
        const now = new Date()
        if (now.getHours() === 21 && now.getMinutes() === 0) {
          const today = new Date().toISOString().split('T')[0]
          const hasReadToday = logs && logs[today] && logs[today].length > 0

          if (!hasReadToday) {
            new Notification('Risale-i Nur Takip', {
              body: 'Bugün biraz rızıklanmak ister misin? ✨ Okumayı unutma.',
              icon: '/icon-192.png'
            })
          }
        }
      }, 60000)
      return () => clearInterval(interval)
    }
  }, [notifPermission, logs])

  const requestNotifPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission()
      setNotifPermission(permission)
    }
  }

  // 2. Data Listeners (Firestore Realtime)
  useEffect(() => {
    if (!currentUser) return

    const userId = currentUser.uid

    // Kitaplar dinleyicisi
    const booksQuery = query(collection(db, 'books'), where('user_id', '==', userId))
    const unsubBooks = onSnapshot(booksQuery, (snapshot) => {
      const list = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data()
      }))
      setMyBooks(list)
    })

    // İstatistikler dinleyicisi
    const statsQuery = query(collection(db, 'book_stats'), where('user_id', '==', userId))
    const unsubStats = onSnapshot(statsQuery, (snapshot) => {
      const statsObj = {}
      snapshot.docs.forEach((docItem) => {
        const item = docItem.data()
        statsObj[item.book_title] = item.count
      })
      setFinishedStats(statsObj)
    })

    // Loglar dinleyicisi
    const logsQuery = query(collection(db, 'reading_logs'), where('user_id', '==', userId))
    const unsubLogs = onSnapshot(logsQuery, (snapshot) => {
      const logsMap = {}
      snapshot.docs.forEach((docItem) => {
        const log = { id: docItem.id, ...docItem.data() }
        if (!logsMap[log.date]) logsMap[log.date] = []
        logsMap[log.date].push(log)
      })
      setLogs(logsMap)
    })

    return () => {
      unsubBooks()
      unsubStats()
      unsubLogs()
    }
  }, [currentUser])

  // Helpers
  const getUserId = () => currentUser?.uid

  const getBookProgress = (book) => {
    let total = 0
    Object.values(logs).flat().forEach((log) => {
      if (log.book_id === book.id) {
        let logTime = new Date(log.created_at).getTime()
        if (log.date) logTime = new Date(log.date).getTime()

        if (book.last_reset) {
          const resetTime = new Date(book.last_reset).getTime()
          if (logTime <= resetTime) return
        }
        total += log.amount
      }
    })
    return total
  }

  const handleBookClick = (book) => {
    setSelectedBook(book)
    setPagesInput('')
    setDateInput(getTodayStr())
    setReadModalOpen(true)
  }

  const handleSaveReading = async () => {
    const validation = validatePagesInput(pagesInput)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    const amount = validation.value
    const uid = getUserId()
    if (!uid || !selectedBook) return

    try {
      const logsQuery = query(
        collection(db, 'reading_logs'),
        where('user_id', '==', uid),
        where('book_id', '==', selectedBook.id),
        where('date', '==', dateInput),
        limit(1)
      )
      const existingLogs = await getDocs(logsQuery)

      let diff = amount

      if (!existingLogs.empty) {
        const oldDoc = existingLogs.docs[0]
        const oldLog = oldDoc.data()
        diff = amount - oldLog.amount
        await updateDoc(doc(db, 'reading_logs', oldDoc.id), { amount: amount })
      } else {
        await addDoc(collection(db, 'reading_logs'), {
          user_id: uid,
          book_id: selectedBook.id,
          title: selectedBook.title,
          amount: amount,
          date: dateInput,
          created_at: new Date().toISOString()
        })
      }

      const bookRef = doc(db, 'books', selectedBook.id)
      const bookSnap = await getDoc(bookRef)
      const currentPages = bookSnap.exists() ? (bookSnap.data().current_pages || 0) : 0
      const newTotal = currentPages + diff
      await updateDoc(bookRef, { current_pages: newTotal })

      setReadModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Hata oluştu.')
    }
  }

  const handleFinishBook = async (e, book) => {
    e.stopPropagation()
    if (!window.confirm(`${book.title} kitabını bitirdiğini onaylıyor musun? Sayaç sıfırlanacak.`)) return
    const uid = getUserId()
    if (!uid) return

    try {
      const statsQuery = query(
        collection(db, 'book_stats'),
        where('user_id', '==', uid),
        where('book_title', '==', book.title),
        limit(1)
      )
      const snap = await getDocs(statsQuery)

      if (!snap.empty) {
        const statDoc = snap.docs[0]
        const currentCount = statDoc.data().count || 0
        await updateDoc(doc(db, 'book_stats', statDoc.id), { count: currentCount + 1 })
      } else {
        await addDoc(collection(db, 'book_stats'), {
          user_id: uid,
          book_title: book.title,
          count: 1
        })
      }

      await updateDoc(doc(db, 'books', book.id), {
        current_pages: 0,
        last_reset: new Date().toISOString()
      })
    } catch (err) {
      console.error(err)
      alert('Kitap bitirilemedi.')
    }
  }

  const handleAddBook = async (title) => {
    const existing = myBooks.find((b) => b.title === title)
    if (existing) {
      alert('Bu kitap zaten listenizde.')
      return
    }
    const uid = getUserId()
    if (!uid) {
      alert('Oturum hatası. Lütfen tekrar giriş yapın.')
      return
    }

    try {
      await addDoc(collection(db, 'books'), {
        user_id: uid,
        title: title,
        current_pages: 0,
        added_at: new Date().toISOString()
      })
      setAddBookModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Kitap eklenirken bir hata oluştu.')
    }
  }

  const handleRemoveBook = async (e, id) => {
    e.stopPropagation()
    if (window.confirm('Bu kitabı listenden kaldırmak istediğine emin misin?')) {
      try {
        await deleteDoc(doc(db, 'books', id))
      } catch (err) {
        console.error(err)
        alert('Kitap kaldırılamadı.')
      }
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Çıkış yapmak istediğine emin misin?')) {
      await signOut(auth)
    }
  }

  const handleUpdateName = async () => {
    const validation = validateName(newNameInput)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    try {
      const uid = currentUser.uid
      await updateProfile(currentUser, { displayName: newNameInput.trim() })
      await updateDoc(doc(db, 'users', uid), { name: newNameInput.trim() })
      setUserProfile((prev) => ({ ...prev, name: newNameInput.trim() }))
      setEditNameModal(false)
    } catch (err) {
      console.error(err)
      alert('İsim güncellenirken hata oluştu.')
    }
  }

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.')
      return
    }

    try {
      await updatePassword(currentUser, newPassword)
      alert('Şifreniz başarıyla güncellendi!')
      setShowPasswordReset(false)
      setNewPassword('')
    } catch (err) {
      let message = 'Şifre güncellenirken bir hata oluştu.'
      if (err.code === 'auth/requires-recent-login') {
        message = 'Güvenlik nedeniyle bu işlem için yeniden giriş yapmanız gerekiyor.'
      } else if (err.code === 'auth/weak-password') {
        message = 'Şifre çok zayıf. Daha güçlü bir şifre seçin.'
      }
      alert(message)
    }
  }

  const handleSaveHatimCount = async () => {
    const count = parseInt(hatimCountInput)
    if (isNaN(count) || count < 0) return
    if (count > 1000) {
      alert("Hatim sayısı 1000'den büyük olamaz")
      return
    }
    try {
      const uid = getUserId()
      if (!uid || !selectedHatimBook) return

      const q = query(
        collection(db, 'book_stats'),
        where('user_id', '==', uid),
        where('book_title', '==', selectedHatimBook),
        limit(1)
      )
      const snap = await getDocs(q)

      if (!snap.empty) {
        await updateDoc(doc(db, 'book_stats', snap.docs[0].id), { count })
      } else {
        await addDoc(collection(db, 'book_stats'), {
          user_id: uid,
          book_title: selectedHatimBook,
          count
        })
      }
      setEditHatimModal(false)
    } catch (err) {
      console.error(err)
      alert('Hatim güncellenirken hata oluştu.')
    }
  }

  if (loadingAuth) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        gap: '16px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #e2e8f0',
          borderTop: '4px solid #0d9488',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Yükleniyor...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!currentUser) {
    return <AuthView />
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
            <HatimlerView
              finishedStats={finishedStats}
              onBack={() => setShowHatimler(false)}
              onEdit={async (book) => {
                setSelectedHatimBook(book)
                setHatimCountInput(String(finishedStats[book] || 0))
                setEditHatimModal(true)
              }}
            />
          ) : (
            <ProfileView
              finishedStats={finishedStats}
              onShowHatimler={() => setShowHatimler(true)}
              publicId={userProfile?.public_id || '...'}
              name={userProfile?.name || currentUser.displayName || 'Misafir'}
              onLogout={handleLogout}
              requestNotifPermission={requestNotifPermission}
              notifPermission={notifPermission}
              onEditName={() => {
                setNewNameInput(userProfile?.name || currentUser.displayName || '')
                setEditNameModal(true)
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
  )
}
