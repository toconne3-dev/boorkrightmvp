'use client'
import { useState } from 'react'

export default function UpgradeButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/stripe/checkout', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.url) {
      setError(data.error || 'Could not start checkout. Please try again.')
      setLoading(false)
      return
    }
    window.location.href = data.url
  }

  return (
    <div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        style={{
          width: '100%', marginTop: '1.25rem', background: loading ? 'var(--border)' : 'var(--accent)',
          color: '#0a0a0a', fontWeight: 700, padding: '0.875rem', borderRadius: '0.5rem',
          border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.9375rem',
          transition: 'opacity 0.15s',
        }}>
        {loading ? 'Redirecting to checkout…' : 'Upgrade to Pro — $29/mo'}
      </button>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.625rem', textAlign: 'center' }}>{error}</p>
      )}
      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '0.625rem' }}>
        Secure checkout via Stripe · Cancel anytime
      </p>
    </div>
  )
}
