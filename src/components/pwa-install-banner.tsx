'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if ((navigator as { standalone?: boolean }).standalone) return
    // User already dismissed
    if (localStorage.getItem('pwa-install-dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    if (ios) {
      setShow(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setShow(false)
  }

  async function install() {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') setShow(false)
  }

  if (!show) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎾</span>
          <div>
            <p className="font-semibold text-green-900 text-sm">App installieren</p>
            <p className="text-xs text-green-700">Für ein besseres Erlebnis</p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-green-400 hover:text-green-600 text-lg leading-none flex-shrink-0"
          aria-label="Schließen"
        >
          ×
        </button>
      </div>

      <ul className="text-xs text-green-800 space-y-1">
        <li className="flex items-center gap-1.5">
          <span>🔔</span>
          <span>Push-Benachrichtigungen für Spielstände</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span>⚡</span>
          <span>Schnellerer Start direkt vom Homescreen</span>
        </li>
        <li className="flex items-center gap-1.5">
          <span>📱</span>
          <span>Vollbildmodus wie eine native App</span>
        </li>
      </ul>

      {isIOS ? (
        <div className="bg-white border border-green-200 rounded-lg px-3 py-2 text-xs text-green-900 space-y-1">
          <p className="font-medium">So geht's auf iPhone/iPad:</p>
          <p>
            Tippe auf{' '}
            <span className="inline-flex items-center gap-0.5 font-medium">
              Teilen
              <svg className="w-3.5 h-3.5 inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </span>
            {' '}in Safari und dann auf{' '}
            <span className="font-medium">„Zum Home-Bildschirm"</span>
          </p>
        </div>
      ) : (
        <button
          onClick={install}
          className="w-full py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 active:bg-green-800 transition-colors"
        >
          Jetzt installieren
        </button>
      )}

      <button
        onClick={dismiss}
        className="w-full text-xs text-green-600 hover:text-green-800"
      >
        Später erinnern
      </button>
    </div>
  )
}
