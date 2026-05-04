'use client'

import { useState } from 'react'

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 rounded bg-green-600 text-white text-xs active:bg-green-800 active:scale-95 transition-all"
    >
      {copied ? 'Kopiert!' : 'Kopieren'}
    </button>
  )
}
