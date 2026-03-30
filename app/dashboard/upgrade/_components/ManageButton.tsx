'use client'
import { useState } from 'react'

export default function ManageButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handlePortal() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.url) {
      setError(data.error || 'Could not open billing portal. Please try again.')
      setLoading(false)
      return
    }
    window.location.href = data.url
  }

  return (
    <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
      <button
        onClick={handlePortal}
        disabled={loading}
        style={{
          background: 'transparent', border: '1px solid var(--border)', color: 'var(--foreground)',
          padding: '0.625rem 1.25rem', borderRadius: '0.5rem', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '0.875rem', fontWeight: 500, transition: 'all 0.15s',
        }}>
        {loading ? 'Opening portal…' : 'Manage billing & subscription →'}
      </button>
      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: '0.5rem' }}>{error}</p>
      )}
      <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
        Update payment method, view invoices, or cancel your subscription.
      </p>
    </div>
  )
}
