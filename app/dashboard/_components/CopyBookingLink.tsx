'use client'
import { useState } from 'react'

export default function CopyBookingLink({ bookingUrl }: { bookingUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`https://${bookingUrl}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = `https://${bookingUrl}`
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ background: 'var(--muted)', border: '1px solid var(--border)', borderRadius: '0.625rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.125rem' }}>Your booking link</p>
        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent)' }}>{bookingUrl}</p>
      </div>
      <button
        onClick={handleCopy}
        style={{ background: copied ? '#22c55e' : 'var(--accent)', color: '#0a0a0a', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 0.875rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
        {copied ? '✓ Copied' : 'Copy'}
      </button>
    </div>
  )
}
