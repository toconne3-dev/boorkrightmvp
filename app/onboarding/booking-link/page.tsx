'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingBookingLink() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Mark onboarding complete
      await supabase.from('artists').update({ onboarding_complete: true }).eq('id', user.id)
      const { data } = await supabase.from('artists').select('booking_slug').eq('id', user.id).single()
      if (data?.booking_slug) setSlug(data.booking_slug)
    }
    load()
  }, [])

  const bookingUrl = `bookright.app/${slug}`

  function copy() {
    navigator.clipboard.writeText(`https://${bookingUrl}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>You&apos;re all set!</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', lineHeight: 1.6 }}>
        Your booking page is live. Share this link anywhere — Instagram bio, text, business card.
      </p>

      {slug && (
        <div style={{ background: 'var(--muted)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '0.375rem' }}>Your booking link</p>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--accent)', wordBreak: 'break-all' }}>{bookingUrl}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button className="btn-primary" onClick={copy}>
          {copied ? '✓ Copied!' : 'Copy booking link'}
        </button>
        <Link href="/dashboard" style={{ display: 'block', textDecoration: 'none', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', color: 'var(--foreground)', fontWeight: 500, fontSize: '0.9375rem' }}>
          Go to dashboard →
        </Link>
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '1.5rem', lineHeight: 1.5 }}>
        You can customize your form, add more services, and block time off from your dashboard anytime.
      </p>
    </div>
  )
}
