import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showLocalNotification
} from './notifications'

describe('notifications utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('checks notification support safely', () => {
    expect(typeof isNotificationSupported()).toBe('boolean')
  })

  it('returns default or granted permission', () => {
    const perm = getNotificationPermission()
    expect(['granted', 'denied', 'default']).toContain(perm)
  })

  it('handles requestPermission gracefully', async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      window.Notification.requestPermission = vi.fn().mockResolvedValue('granted')
      const result = await requestNotificationPermission()
      expect(result).toBe('granted')
    }
  })

  it('returns false when permission is not granted', async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Object.defineProperty(window.Notification, 'permission', {
        value: 'denied',
        configurable: true
      })
      const shown = await showLocalNotification('Test')
      expect(shown).toBe(false)
    }
  })
})
