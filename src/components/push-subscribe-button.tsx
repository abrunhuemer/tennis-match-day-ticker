'use client'

import { useState, useEffect } from 'react'

type Props = {
  matchId?: string
  encounterId?: string
  vapidPublicKey: string
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export default function PushSubscribeButton({ matchId, encounterId, vapidPublicKey }: Props) {
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          setSubscribed(!!sub)
        })
      }).catch(() => {})
    }
  }, [])

  if (!supported) return null

  async function toggle() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/subscriptions', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
          setSubscribed(false)
        }
        return
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })

      const { p256dh, auth } = sub.getKey
        ? {
          p256dh: Buffer.from(sub.getKey('p256dh') as ArrayBuffer).toString('base64'),
          auth: Buffer.from(sub.getKey('auth') as ArrayBuffer).toString('base64'),
        }
        : { p256dh: '', auth: '' }

      await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: { p256dh, auth },
          matchId,
          encounterId,
        }),
      })

      setSubscribed(true)
    } catch (err) {
      console.error('Push subscribe error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        subscribed
          ? 'bg-green-50 text-green-700 border border-green-300'
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
      } disabled:opacity-50`}
    >
      <span>{subscribed ? '🔔' : '🔕'}</span>
      {subscribed ? 'Benachrichtigungen an' : 'Benachrichtigungen'}
    </button>
  )
}
