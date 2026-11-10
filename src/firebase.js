import { initializeApp } from 'firebase/app'
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager
} from 'firebase/firestore'

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

/**
 * Detects whether the app is running inside an installed standalone PWA shell.
 */
export const isStandalonePwa = () =>
  typeof window !== 'undefined' &&
  Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  )

export const app = initializeApp(firebaseConfig)

// Initialize Auth without popupRedirectResolver: the app only uses email/password,
// and omitting the resolver prevents Firebase Auth from blocking mobile/Safari startup
// on gapi + cross-origin auth iframe pings.
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence
  ]
})

// Standalone PWAs run in a single window; forceOwnership avoids stale IndexedDB
// multi-tab lease delays when the OS kills the app without firing pagehide.
const tabManager = isStandalonePwa()
  ? persistentSingleTabManager({ forceOwnership: true })
  : persistentMultipleTabManager()

// Firestore with offline persistence for PWA support
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager })
})
