import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyD7XyPbY0i5zs-FqQnBsYfTjZTPNGHmqSk',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'okuma-takip-46d31.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'okuma-takip-46d31',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'okuma-takip-46d31.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '211297959550',
  appId: env.VITE_FIREBASE_APP_ID || '1:211297959550:web:028412602dffd0ca1c622f',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || 'G-R1KSKPCP9K'
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Firestore with offline persistence for PWA support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
})
