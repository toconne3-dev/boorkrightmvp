'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DEPOSIT_METHODS = [
  { value: '', label: 'No deposit collection' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
]

const HANDLE_PLACEHOLDERS: Record<string, string> = {
  venmo: '@your-venmo',
  cashapp: '$yourcashtag',
  zelle: 'phone or email',
  paypal: 'paypal.me/yourname',
  other: 'your payment details',
}

export default function SettingsPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', business_name: '', bio: '', city: '', booking_slug: '' })
  const [deposit, setDeposit] = useState({ method: '', handle: '', instructions: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [depositSaving, setDepositSaving] = useState(false)
  const [depositSaved, setDepositSaved] = useState(false)
  const [error, setError] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [originalSlug, setOriginalSlug] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('artists')
        .select('name,business_name,bio,city,booking_slug,deposit_method,deposit_handle,deposit_instructions')
        .eq('id', user.id)
        .single()
      if (data) {
        setForm({ name: data.name || '', business_name: data.business_name || '', bio: data.bio || '', city: data.city || '', booking_slug: data.booking_slug || '' })
        setOriginalSlug(data.booking_slug || '')
        setDeposit({
          method: data.deposit_method || '',
          handle: data.deposit_handle || '',
          instructions: data.deposit_instructions || '',
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  async function checkSlug() {
    if (!form.booking_slug || form.booking_slug === originalSlug) { setSlugAvailable(null); return }
    const supabase = createClient()
    const { data } = await supabase.from('artists').select('id').eq('booking_slug', form.booking_slug).maybeSingle()
    setSlugAvailable(!data)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (slugAvailable === false) { setError('That booking handle is taken. Choose another.'); return }
    setError('')
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: updateError } = await supabase.from('artists').update({
      name: form.name, business_name: form.business_name, bio: form.bio, city: form.city, booking_slug: form.booking_slug,
    }).eq('id', user.id)
    if (updateError) { setError(updateError.message); setSaving(false); return }
    setOriginalSlug(form.booking_slug)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleDepositSave(e: React.FormEvent) {
    e.preventDefault()
    if (deposit.method && !deposit.handle) {
      alert('Please enter your payment handle or username.')
      return
    }
    setDepositSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('artists').update({
      deposit_method: deposit.method || null,
      deposit_handle: deposit.handle || null,
      deposit_instructions: deposit.instructions || null,
    }).eq('id', user.id)
    setDepositSaving(false)
    setDepositSaved(true)
    setTimeout(() => setDepositSaved(false), 2500)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: '2rem' }}>Loading…</div>

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Update your profile and booking page info.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>Profile</p>
          <div className="field">
            <label>Your name</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Alex Rivera" required />
          </div>
          <div className="field">
            <label>Studio / business name</label>
            <input type="text" value={form.business_name} onChange={e => setForm(p => ({ ...p, business_name: e.target.value }))} placeholder="Inkwell Studio" />
          </div>
          <div className="field">
            <label>Bio</label>
            <textarea rows={3} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell clients a bit about you and your work." style={{ resize: 'vertical' }} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>City</label>
            <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="Atlanta, GA" />
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>Booking link</p>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Your handle</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>bookright.app/</span>
              <input type="text" value={form.booking_slug}
                onChange={e => { setForm(p => ({ ...p, booking_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })); setSlugAvailable(null) }}
                onBlur={checkSlug} style={{ flex: 1 }} required />
            </div>
            {slugAvailable === true && <p className="success-text">✓ Available</p>}
            {slugAvailable === false && <p className="error-text">Already taken. Try another.</p>}
          </div>
        </div>

        {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={saving} style={{ marginBottom: '1.5rem' }}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </form>

      {/* Deposit collection */}
      <form onSubmit={handleDepositSave}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9375rem' }}>Deposit collection</p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem' }}>
            When a service requires a deposit, clients will see these instructions after booking. You collect payment directly — no processing fees.
          </p>

          <div className="field">
            <label>Payment method</label>
            <select value={deposit.method} onChange={e => setDeposit(p => ({ ...p, method: e.target.value, handle: '' }))}>
              {DEPOSIT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          {deposit.method && (
            <div className="field">
              <label>
                {deposit.method === 'venmo' ? 'Venmo username' :
                 deposit.method === 'cashapp' ? 'Cash App $cashtag' :
                 deposit.method === 'zelle' ? 'Zelle phone or email' :
                 deposit.method === 'paypal' ? 'PayPal.me link or email' :
                 'Payment details'}
              </label>
              <input
                type="text"
                value={deposit.handle}
                onChange={e => setDeposit(p => ({ ...p, handle: e.target.value }))}
                placeholder={HANDLE_PLACEHOLDERS[deposit.method] || ''}
                required={!!deposit.method}
              />
            </div>
          )}

          <div className="field" style={{ marginBottom: 0 }}>
            <label>Custom instructions (optional)</label>
            <textarea
              rows={2}
              value={deposit.instructions}
              onChange={e => setDeposit(p => ({ ...p, instructions: e.target.value }))}
              placeholder="e.g. Include your name and appointment date in the note."
              style={{ resize: 'vertical' }}
            />
          </div>

          {deposit.method && deposit.handle && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(200,169,126,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(200,169,126,0.2)' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>Preview — what clients will see:</p>
              <p style={{ fontSize: '0.875rem' }}>
                Send your deposit to <strong style={{ color: 'var(--accent)' }}>{deposit.handle}</strong> via <strong>{DEPOSIT_METHODS.find(m => m.value === deposit.method)?.label}</strong>.
              </p>
              {deposit.instructions && <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>{deposit.instructions}</p>}
            </div>
          )}
        </div>

        <button type="submit" className="btn-primary" disabled={depositSaving} style={{ marginBottom: '1.5rem' }}>
          {depositSaving ? 'Saving…' : depositSaved ? '✓ Saved' : 'Save deposit settings'}
        </button>
      </form>

      {/* Danger zone */}
      <div className="card" style={{ marginTop: '1rem', border: '1px solid rgba(239,68,68,0.2)' }}>
        <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9375rem', color: 'var(--destructive)' }}>Account</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>Log out of your BookRight account on this device.</p>
        <button type="button" onClick={handleLogout}
          style={{ background: 'transparent', border: '1px solid var(--destructive)', color: 'var(--destructive)', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
          Log out
        </button>
      </div>
    </div>
  )
}
