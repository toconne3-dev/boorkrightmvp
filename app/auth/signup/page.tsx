'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    // Create artist record
    if (data.user) {
      await supabase.from('artists').insert({
        id: data.user.id,
        email,
        name,
      })
    }

    setSuccess(true)
    setLoading(false)

    // If email confirmation is disabled in Supabase, redirect immediately
    if (data.session) {
      router.push('/onboarding/profile')
    }
  }

  if (success && !error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✉️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Check your email</h1>
          <p style={{ color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
            We sent a confirmation link to <strong style={{ color: 'var(--foreground)' }}>{email}</strong>. Click it to activate your account and get started.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent)', textDecoration: 'none' }}>BookRight</Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.375rem' }}>Create your account</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>Free to start. No credit card required.</p>
        </div>

        <div className="card">
          <form onSubmit={handleSignup}>
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input id="name" type="text" placeholder="Alex Rivera" value={name} onChange={e => setName(e.target.value)} required autoFocus />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" placeholder="alex@studio.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="8+ characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            By signing up, you agree to our{' '}
            <Link href="/terms" style={{ color: 'var(--accent)' }}>Terms</Link> and{' '}
            <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>
          Already have an account?{' '}
          <Link href="/auth/login" style={{ color: 'var(--accent)', fontWeight: 500 }}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
