export const isNotificationSupported = () => {
  return typeof window !== 'undefined' && 'Notification' in window
}

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export const showLocalNotification = async (title, options = {}) => {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false
  }

  const basePath = import.meta.env.BASE_URL || '/'
  const iconPath = `${basePath.endsWith('/') ? basePath : basePath + '/'}icon-192.png`

  const defaultOptions = {
    icon: iconPath,
    badge: iconPath,
    vibrate: [200, 100, 200],
    ...options
  }

  // Mobile browsers require ServiceWorkerRegistration.showNotification()
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions)
        return true
      }
    } catch (e) {
      console.warn('ServiceWorker notification failed, trying fallback:', e)
    }
  }

  // Desktop browser fallback
  try {
    new Notification(title, defaultOptions)
    return true
  } catch (e) {
    console.error('Local notification could not be shown:', e)
    return false
  }
}
