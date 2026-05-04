'use client'

export default function CopyButton({ value }: { value: string }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(value)}
      className="px-2 py-1 rounded bg-green-600 text-white text-xs"
    >
      Kopieren
    </button>
  )
}
