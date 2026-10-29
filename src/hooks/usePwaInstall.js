import { useState, useEffect } from 'react'

const getIsInstalled = () => {
  if (typeof window === 'undefined') return false
  return Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator?.standalone === true
  )
}

const getIsIOS = () => {
  if (typeof window === 'undefined') return false
  const userAgent = window.navigator?.userAgent?.toLowerCase() || ''
  return /iphone|ipad|ipod/.test(userAgent)
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(getIsInstalled)
  const [isIOS] = useState(getIsIOS)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // Capture beforeinstallprompt for Android & desktop Chrome/Edge
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) {
      setShowIosGuide(true)
      return
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
      }
      setDeferredPrompt(null)
    } catch {
      setShowIosGuide(true)
    }
  }

  return {
    isInstallable: !isInstalled,
    isInstalled,
    isIOS,
    showIosGuide,
    setShowIosGuide,
    handleInstallClick
  }
}
