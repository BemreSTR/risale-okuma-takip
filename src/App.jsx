import { useState, useEffect, useRef } from 'react'
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
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction
} from 'firebase/firestore'
import {
  validatePagesInput,
  validateDateInput,
  validateName,
  generatePublicId,
  getTodayStr,
  calculateBookProgress
} from './utils/helpers'
import {
  saveReadingLog,
  deleteReadingLog,
  addBookIfMissing,
  finishBookTransaction,
  saveHatimCountTransaction
} from './utils/readingService'
import {
  getNotificationPermission,
  requestNotificationPermission,
  showLocalNotification
} from './utils/notifications'

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
  const [logsLoaded, setLogsLoaded] = useState(false)

  // UI States
  const [readModalOpen, setReadModalOpen] = useState(false)
  const [addBookModalOpen, setAddBookModalOpen] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [selectedBook, setSelectedBook] = useState(null)
  const [pagesInput, setPagesInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission)
  const [editNameModal, setEditNameModal] = useState(false)
  const [newNameInput, setNewNameInput] = useState('')

  // Async action loading & concurrency locks
  const [isSavingReading, setIsSavingReading] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState(null)
  const [isAddingBook, setIsAddingBook] = useState(false)
  const [finishingBookId, setFinishingBookId] = useState(null)
  const [removingBookId, setRemovingBookId] = useState(null)
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isSavingHatim, setIsSavingHatim] = useState(false)

  const saveReadingLockRef = useRef(false)
  const deleteLogLockRef = useRef(new Set())
  const addBookLockRef = useRef(false)
  const finishBookLockRef = useRef(new Set())
  const removeBookLockRef = useRef(new Set())
  const updateNameLockRef = useRef(false)
  const updatePasswordLockRef = useRef(false)
  const saveHatimLockRef = useRef(false)
  const notifLockRef = useRef(false)

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (!user) {
        setUserProfile(null)
        setMyBooks([])
        setFinishedStats({})
        setLogs({})
        setLogsLoaded(false)
      }
      setLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [])

  // 1.2 User Profile Realtime Listener & Race-Free Auto-Heal
  useEffect(() => {
    if (!currentUser) return

    const userRef = doc(db, 'users', currentUser.uid)
    let autoHealTimer = null
    let healingAttempted = false

    const ensureProfileTransaction = async () => {
      if (healingAttempted) return
      healingAttempted = true
      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(userRef)
          if (!snap.exists()) {
            const activeUser = auth.currentUser || currentUser
            transaction.set(userRef, {
              id: currentUser.uid,
              name: activeUser.displayName || 'Okuyucu',
              email: activeUser.email || '',
              public_id: generatePublicId(),
              created_at: new Date().toISOString()
            })
          }
        })
      } catch (err) {
        console.error('Kullanıcı profili alınamadı:', err)
      }
    }

    const unsubProfile = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        if (autoHealTimer) {
          clearTimeout(autoHealTimer)
          autoHealTimer = null
        }
        setUserProfile(snapshot.data())
      } else if (!snapshot.metadata.fromCache || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        const createdMs = currentUser.metadata?.creationTime
          ? new Date(currentUser.metadata.creationTime).getTime()
          : 0
        const isBrandNew = createdMs > 0 && Date.now() - createdMs < 5000

        if (isBrandNew) {
          if (!autoHealTimer) {
            autoHealTimer = setTimeout(ensureProfileTransaction, 3000)
          }
        } else {
          ensureProfileTransaction()
        }
      }
    })

    return () => {
      if (autoHealTimer) clearTimeout(autoHealTimer)
      unsubProfile()
    }
  }, [currentUser])

  // 1.5 Bildirim Hatırlatıcı (21:00)
  useEffect(() => {
    if (!currentUser || !logsLoaded || notifPermission !== 'granted') return

    const checkAndNotify = async () => {
      if (notifLockRef.current) return
      const now = new Date()
      // 21:00 veya sonrasında henüz okunmadıysa ve bugün bildirim gitmediyse
      if (now.getHours() >= 21) {
        const today = getTodayStr()
        const hasReadToday = logs && logs[today] && logs[today].length > 0
        const lastNotifDate = localStorage.getItem('last_notif_date')

        if (!hasReadToday && lastNotifDate !== today) {
          notifLockRef.current = true
          try {
            const shown = await showLocalNotification('Risale-i Nur Takip', {
              body: 'Bugün biraz rızıklanmak ister misin? ✨ Okumayı unutma.'
            })
            if (shown) {
              localStorage.setItem('last_notif_date', today)
            }
          } finally {
            notifLockRef.current = false
          }
        }
      }
    }

    checkAndNotify()
    const interval = setInterval(checkAndNotify, 60000)
    return () => clearInterval(interval)
  }, [currentUser, logsLoaded, notifPermission, logs])

  const requestNotifPermission = async () => {
    const permission = await requestNotificationPermission()
    setNotifPermission(permission)
    if (permission === 'granted') {
      await showLocalNotification('Risale-i Nur Takip', {
        body: 'Akşam hatırlatmaları aktif! Saat 21:00\'de bildirim alacaksınız. ✨'
      })
    }
  }

  const handleTestNotification = async () => {
    if (notifPermission !== 'granted') {
      const permission = await requestNotificationPermission()
      setNotifPermission(permission)
      if (permission !== 'granted') {
        alert('Bildirim izni verilmedi. Lütfen tarayıcı veya cihaz ayarlarından bildirimlere izin verin.')
        return
      }
    }
    const success = await showLocalNotification('Risale-i Nur Takip (Test)', {
      body: 'Harika! Telefonunuza bildirimler başarıyla ulaşıyor. 🔔'
    })
    if (!success) {
      alert('Bildirim gösterilemedi. Lütfen bildirim izinlerinizi kontrol edin.')
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
      setLogsLoaded(true)
    })

    return () => {
      unsubBooks()
      unsubStats()
      unsubLogs()
    }
  }, [currentUser])

  // Helpers
  const getUserId = () => currentUser?.uid

  const getBookProgress = (book) => calculateBookProgress(book, logs)

  const handleBookClick = (book) => {
    setSelectedBook(book)
    setPagesInput('')
    setDateInput(getTodayStr())
    setReadModalOpen(true)
  }

  const handleSaveReading = async () => {
    if (saveReadingLockRef.current) return

    const validation = validatePagesInput(pagesInput)
    if (!validation.valid) {
      alert(validation.error)
      return
    }
    const dateValidation = validateDateInput(dateInput)
    if (!dateValidation.valid) {
      alert(dateValidation.error)
      return
    }
    const uid = getUserId()
    if (!uid || !selectedBook) return

    saveReadingLockRef.current = true
    setIsSavingReading(true)
    try {
      await saveReadingLog(db, {
        uid,
        book: selectedBook,
        amount: validation.value,
        dateInput: dateValidation.value
      })
      setReadModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Hata oluştu.')
    } finally {
      saveReadingLockRef.current = false
      setIsSavingReading(false)
    }
  }

  const handleDeleteLog = async (log) => {
    if (!log?.id || deleteLogLockRef.current.has(log.id)) return
    if (!window.confirm(`${log.title} (${log.amount} sayfa) okuma kaydını silmek istediğine emin misin?`)) return

    deleteLogLockRef.current.add(log.id)
    setDeletingLogId(log.id)
    try {
      await deleteReadingLog(db, log)
    } catch (err) {
      console.error(err)
      alert('Okuma kaydı silinemedi.')
    } finally {
      deleteLogLockRef.current.delete(log.id)
      setDeletingLogId((prev) => (prev === log.id ? null : prev))
    }
  }

  const handleFinishBook = async (e, book) => {
    e.stopPropagation()
    if (finishBookLockRef.current.has(book.id)) return
    if (!window.confirm(`${book.title} kitabını bitirdiğini onaylıyor musun? Sayaç sıfırlanacak.`)) return
    const uid = getUserId()
    if (!uid) return

    finishBookLockRef.current.add(book.id)
    setFinishingBookId(book.id)
    try {
      await finishBookTransaction(db, { uid, book })
    } catch (err) {
      console.error(err)
      alert('Kitap bitirilemedi.')
    } finally {
      finishBookLockRef.current.delete(book.id)
      setFinishingBookId((prev) => (prev === book.id ? null : prev))
    }
  }

  const handleAddBook = async (title) => {
    if (addBookLockRef.current) return
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

    addBookLockRef.current = true
    setIsAddingBook(true)
    try {
      const result = await addBookIfMissing(db, { uid, title })
      if (!result.added) {
        alert('Bu kitap zaten listenizde.')
        return
      }
      setAddBookModalOpen(false)
    } catch (err) {
      console.error(err)
      alert('Kitap eklenirken bir hata oluştu.')
    } finally {
      addBookLockRef.current = false
      setIsAddingBook(false)
    }
  }

  const handleRemoveBook = async (e, id) => {
    e.stopPropagation()
    if (removeBookLockRef.current.has(id)) return
    if (!window.confirm('Bu kitabı listenden kaldırmak istediğine emin misin?')) return

    removeBookLockRef.current.add(id)
    setRemovingBookId(id)
    try {
      await deleteDoc(doc(db, 'books', id))
    } catch (err) {
      console.error(err)
      alert('Kitap kaldırılamadı.')
    } finally {
      removeBookLockRef.current.delete(id)
      setRemovingBookId((prev) => (prev === id ? null : prev))
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Çıkış yapmak istediğine emin misin?')) {
      await signOut(auth)
    }
  }

  const handleUpdateName = async () => {
    if (updateNameLockRef.current) return
    const validation = validateName(newNameInput)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    updateNameLockRef.current = true
    setIsUpdatingName(true)
    try {
      const uid = currentUser.uid
      const trimmedName = newNameInput.trim()
      await updateProfile(currentUser, { displayName: trimmedName })
      await updateDoc(doc(db, 'users', uid), { name: trimmedName })
      setUserProfile((prev) => ({ ...prev, name: trimmedName }))
      setEditNameModal(false)
    } catch (err) {
      console.error(err)
      alert('İsim güncellenirken hata oluştu.')
    } finally {
      updateNameLockRef.current = false
      setIsUpdatingName(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (updatePasswordLockRef.current) return
    if (newPassword.length < 6) {
      alert('Şifre en az 6 karakter olmalıdır.')
      return
    }

    updatePasswordLockRef.current = true
    setIsUpdatingPassword(true)
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
    } finally {
      updatePasswordLockRef.current = false
      setIsUpdatingPassword(false)
    }
  }

  const handleSaveHatimCount = async () => {
    if (saveHatimLockRef.current) return
    const count = parseInt(hatimCountInput)
    if (isNaN(count) || count < 0) return
    if (count > 1000) {
      alert("Hatim sayısı 1000'den büyük olamaz")
      return
    }
    const uid = getUserId()
    if (!uid || !selectedHatimBook) return

    saveHatimLockRef.current = true
    setIsSavingHatim(true)
    try {
      await saveHatimCountTransaction(db, {
        uid,
        bookTitle: selectedHatimBook,
        count
      })
      setEditHatimModal(false)
    } catch (err) {
      console.error(err)
      alert('Hatim güncellenirken hata oluştu.')
    } finally {
      saveHatimLockRef.current = false
      setIsSavingHatim(false)
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

  const existingDayAmount =
    selectedBook && dateInput && logs[dateInput]
      ? logs[dateInput]
          .filter((log) => log.book_id === selectedBook.id)
          .reduce((sum, log) => sum + (log.amount || 0), 0)
      : null

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
            finishingBookId={finishingBookId}
            removingBookId={removingBookId}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarView
            logs={logs}
            onDeleteLog={handleDeleteLog}
            deletingLogId={deletingLogId}
          />
        )}
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
              onTestNotification={handleTestNotification}
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
        isSaving={isUpdatingName}
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
        isSaving={isSavingReading}
        existingDayAmount={existingDayAmount}
      />

      <AddBookModal
        isOpen={addBookModalOpen}
        onClose={() => setAddBookModalOpen(false)}
        onAddBook={handleAddBook}
        isSaving={isAddingBook}
      />

      <PasswordResetModal
        isOpen={showPasswordReset}
        onClose={() => setShowPasswordReset(false)}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onSave={handleUpdatePassword}
        isSaving={isUpdatingPassword}
      />

      <HatimEditModal
        isOpen={editHatimModal}
        onClose={() => setEditHatimModal(false)}
        selectedHatimBook={selectedHatimBook}
        hatimCountInput={hatimCountInput}
        setHatimCountInput={setHatimCountInput}
        onSave={handleSaveHatimCount}
        isSaving={isSavingHatim}
      />
    </div>
  )
}
