import { useState, useEffect } from 'react'
import { BookOpen, Mail, Lock, User as UserIcon, ArrowRight, Loader2, Info, Eye, EyeOff, CheckCircle, X } from 'lucide-react'
import { auth, db } from '../firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDocs,
  query,
  collection,
  where,
  limit
} from 'firebase/firestore'
import { validateName, validatePassword, generatePublicId } from '../utils/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import ReactMarkdown from 'react-markdown'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'

export default function AuthView() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Register Form
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Login Form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  const [successMsg, setSuccessMsg] = useState('')
  const [authTab, setAuthTab] = useState('login')

  const handleRegister = async () => {
    if (!name || !email || !password) return setErrorMsg('Lütfen tüm alanları doldurunuz.')

    const nameValidation = validateName(name)
    if (!nameValidation.valid) return setErrorMsg(nameValidation.error)

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) return setErrorMsg(passwordValidation.error)

    setErrorMsg('')
    setLoading(true)
    try {
      // 1. Firebase Auth ile Kayıt
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const user = userCredential.user

      // Profile güncelle (displayName)
      await updateProfile(user, { displayName: name.trim() })

      // 2. Benzersiz bir Public ID bulana kadar dene (Kullanıcı artık authenticated)
      let publicId = ''
      let isUnique = false
      let attempts = 0

      while (!isUnique && attempts < 5) {
        const candidateId = generatePublicId()
        const q = query(collection(db, 'users'), where('public_id', '==', candidateId), limit(1))
        const snapshot = await getDocs(q)
        if (snapshot.empty) {
          publicId = candidateId
          isUnique = true
        }
        attempts++
      }

      if (!publicId) {
        publicId = generatePublicId()
      }

      // 3. Firestore'da users dokümanı oluştur
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid,
        name: name.trim(),
        email: email.trim(),
        public_id: publicId,
        created_at: new Date().toISOString()
      })
    } catch (e) {
      let msg = 'Kayıt hatası.'
      if (e.code === 'auth/email-already-in-use') {
        msg = 'Bu e-posta zaten kullanımda.'
      } else if (e.code === 'auth/weak-password') {
        msg = 'Şifre en az 6 karakter olmalıdır.'
      } else if (e.code === 'auth/invalid-email') {
        msg = 'Geçerli bir e-posta adresi giriniz.'
      } else if (e.message) {
        msg = e.message
      }
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) return setErrorMsg('Lütfen bilgileri giriniz.')
    setErrorMsg('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword)
    } catch (e) {
      let msg = 'Giriş yapılamadı.'
      if (
        e.code === 'auth/user-not-found' ||
        e.code === 'auth/wrong-password' ||
        e.code === 'auth/invalid-credential'
      ) {
        msg = 'Hatalı e-posta veya şifre.'
      } else if (e.code === 'auth/too-many-requests') {
        msg = 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.'
      } else if (e.code === 'auth/invalid-email') {
        msg = 'Geçerli bir e-posta adresi giriniz.'
      } else if (e.message) {
        msg = e.message
      }
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!loginEmail) return setErrorMsg('Sıfırlama linki için lütfen e-posta adresinizi giriniz.')
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, loginEmail.trim())
      setSuccessMsg('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
    } catch (e) {
      let msg = 'Bağlantı gönderilemedi.'
      if (e.code === 'auth/user-not-found') {
        msg = 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.'
      } else if (e.code === 'auth/too-many-requests') {
        msg = 'Çok fazla deneme yaptınız, lütfen bekleyin.'
      } else if (e.code === 'auth/invalid-email') {
        msg = 'Geçerli bir e-posta adresi giriniz.'
      } else if (e.message) {
        msg = e.message
      }
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (errorMsg || successMsg) {
      const timer = setTimeout(() => {
        setErrorMsg('')
        setSuccessMsg('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMsg, successMsg])

  const handleLoginSubmit = (e) => {
    e.preventDefault()
    handleLogin()
  }

  const handleRegisterSubmit = (e) => {
    e.preventDefault()
    handleRegister()
  }

  const [legalModal, setLegalModal] = useState({ open: false, title: '', content: '' })

  const fetchLegalContent = async (type) => {
    const baseUrl = import.meta.env.BASE_URL
    const file = type === 'terms' ? `${baseUrl}TERMS.md` : `${baseUrl}PRIVACY.md`
    const title = type === 'terms' ? 'Kullanım Koşulları' : 'Aydınlatma Metni'
    try {
      const response = await fetch(file)
      const text = await response.text()
      setLegalModal({ open: true, title, content: text })
    } catch {
      setLegalModal({ open: true, title, content: 'İçerik yüklenirken bir hata oluştu.' })
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-4">
      <AnimatePresence>
        {(errorMsg || successMsg) && (
          <motion.div
            initial={{ opacity: 0, x: '-50%', y: -50, scale: 0.95 }}
            animate={{ opacity: 1, x: '-50%', y: 0, scale: 1 }}
            exit={{ opacity: 0, x: '-50%', y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm cursor-pointer"
            onClick={() => { setErrorMsg(''); setSuccessMsg('') }}
          >
            <Alert
              variant={errorMsg ? 'destructive' : 'default'}
              className={`shadow-2xl border-2 ${successMsg ? 'border-green-500 bg-white/95 backdrop-blur text-green-700' : 'bg-white/95 backdrop-blur'}`}
            >
              <div className="flex items-center gap-3">
                {errorMsg ? <Info className="h-5 w-5" /> : <CheckCircle className="h-5 w-5 text-green-600" />}
                <div className="flex-1">
                  <AlertTitle className="font-bold text-base">{errorMsg ? 'Hata' : 'Başarılı'}</AlertTitle>
                  <AlertDescription className="font-medium">
                    {errorMsg || successMsg}
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

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

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="w-full shadow-xl border-none overflow-hidden">
          <Tabs value={authTab} onValueChange={setAuthTab} className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="login" className="text-sm font-semibold">Giriş Yap</TabsTrigger>
                <TabsTrigger value="register" className="text-sm font-semibold">Kayıt Ol</TabsTrigger>
              </TabsList>
            </CardHeader>

            <AnimatePresence mode="wait">
              <CardContent className="pt-4 px-8 min-h-[360px] relative">
                <motion.div
                  key={authTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="absolute inset-0 px-8"
                >
                  {authTab === 'login' ? (
                    <div className="space-y-4 m-0">
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
                              type={showLoginPassword ? 'text' : 'password'}
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
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleForgotPassword}
                              className="text-xs font-semibold text-primary hover:underline transition-all"
                            >
                              Şifremi unuttum
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
                            'Giriş Yap'
                          )}
                          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4 m-0">
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
                          <Label htmlFor="reg-pass">Şifre</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reg-pass"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="En az 6 karakter"
                              autoComplete="new-password"
                              required
                              className="pl-10 pr-10 h-11"
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
                        <div className="pt-2">
                          <Button
                            type="submit"
                            className="w-full h-11 text-base font-semibold shadow-lg shadow-teal-500/10 transition-all hover:scale-[1.01]"
                            disabled={loading}
                          >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Kayıt Ol'}
                            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </motion.div>
              </CardContent>
            </AnimatePresence>
          </Tabs>
          <CardFooter className="flex flex-col space-y-4 pb-8 pt-2">
            <div className="w-full flex items-center justify-center gap-2">
              <Separator className="flex-1" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Hizmet ve Gizlilik</span>
              <Separator className="flex-1" />
            </div>
            <p className="text-center text-[10px] text-slate-400 px-6 leading-normal">
              Kaydolarak{' '}
              <button
                type="button"
                onClick={() => fetchLegalContent('terms')}
                className="text-teal-600 font-bold hover:underline"
              >
                kullanım koşullarımızı
              </button>
              {' '}ve{' '}
              <button
                type="button"
                onClick={() => fetchLegalContent('privacy')}
                className="text-teal-600 font-bold hover:underline"
              >
                aydınlatma metnini
              </button>
              {' '}kabul etmiş sayılırsınız. Verileriniz güvenle saklanmaktadır.
            </p>
          </CardFooter>
        </Card>
      </motion.div>

      {/* Legal Modal */}
      <AnimatePresence>
        {legalModal.open && (
          <div className="modal-overlay" onClick={() => setLegalModal({ ...legalModal, open: false })}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-lg text-slate-800">{legalModal.title}</h3>
                <button onClick={() => setLegalModal({ ...legalModal, open: false })} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto prose prose-sm max-w-none prose-slate">
                <ReactMarkdown>{legalModal.content}</ReactMarkdown>
              </div>
              <div className="p-4 border-t bg-slate-50 flex justify-end">
                <Button onClick={() => setLegalModal({ ...legalModal, open: false })}>Kapat</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
