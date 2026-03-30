'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })

    if (loginError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)', textDecoration: 'none' }}>BookRight</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.375rem' }}>Welcome back</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>Log in to your BookRight account.</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin}>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" placeholder="alex@studio.com" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Your password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--accent)', fontWeight: 500 }}>Sign up free</Link>
        </p>
      </div>
    </div>
  )
}
