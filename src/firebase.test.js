import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockInitializeApp = vi.fn(() => ({ name: '[DEFAULT]' }))
const mockInitializeAuth = vi.fn(() => ({ name: 'mock-auth' }))
const mockInitializeFirestore = vi.fn(() => ({ name: 'mock-db' }))
const mockPersistentLocalCache = vi.fn((opts) => ({ type: 'persistent', ...opts }))
const mockPersistentMultipleTabManager = vi.fn(() => ({ type: 'multi-tab' }))
const mockPersistentSingleTabManager = vi.fn((opts) => ({ type: 'single-tab', ...opts }))

vi.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp
}))

vi.mock('firebase/auth', () => ({
  initializeAuth: mockInitializeAuth,
  indexedDBLocalPersistence: { type: 'LOCAL' },
  browserLocalPersistence: { type: 'LOCAL' },
  browserSessionPersistence: { type: 'SESSION' }
}))

vi.mock('firebase/firestore', () => ({
  initializeFirestore: mockInitializeFirestore,
  persistentLocalCache: mockPersistentLocalCache,
  persistentMultipleTabManager: mockPersistentMultipleTabManager,
  persistentSingleTabManager: mockPersistentSingleTabManager
}))

describe('firebase initialization', () => {
  const originalMatchMedia = window.matchMedia
  const originalStandalone = window.navigator.standalone

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    Object.defineProperty(window.navigator, 'standalone', {
      value: originalStandalone,
      configurable: true
    })
  })

  it('initializes auth without popupRedirectResolver to avoid mobile iframe stall', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    await import('./firebase')

    expect(mockInitializeAuth).toHaveBeenCalledTimes(1)
    const [, authOptions] = mockInitializeAuth.mock.calls[0]
    expect(authOptions).not.toHaveProperty('popupRedirectResolver')
    expect(authOptions.persistence).toHaveLength(3)
    expect(mockPersistentMultipleTabManager).toHaveBeenCalledTimes(1)
    expect(mockPersistentSingleTabManager).not.toHaveBeenCalled()
  })

  it('uses single-tab forceOwnership in standalone PWA mode (matchMedia)', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    const { isStandalonePwa } = await import('./firebase')

    expect(isStandalonePwa()).toBe(true)
    expect(mockPersistentSingleTabManager).toHaveBeenCalledWith({ forceOwnership: true })
    expect(mockPersistentMultipleTabManager).not.toHaveBeenCalled()
  })

  it('uses single-tab forceOwnership in iOS standalone mode (navigator.standalone)', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true
    })

    const { isStandalonePwa } = await import('./firebase')

    expect(isStandalonePwa()).toBe(true)
    expect(mockPersistentSingleTabManager).toHaveBeenCalledWith({ forceOwnership: true })
  })
})
