'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Service { name: string; description: string; duration_minutes: number; price: string; deposit_amount: string }

const DURATION_OPTIONS = [15,30,45,60,90,120,150,180,240,300,360,420,480]

function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}min` : `${h}hr`
}

const emptyService = (): Service => ({ name: '', description: '', duration_minutes: 60, price: '', deposit_amount: '' })

export default function OnboardingServices() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([emptyService()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(i: number, field: keyof Service, value: string | number) {
    setServices(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function addService() { setServices(prev => [...prev, emptyService()]) }

  function removeService(i: number) { setServices(prev => prev.filter((_, idx) => idx !== i)) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (services.some(s => !s.name)) { setError('Every service needs a name.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const rows = services.map((s, i) => ({
      artist_id: user.id,
      name: s.name,
      description: s.description || null,
      duration_minutes: s.duration_minutes,
      price: s.price ? Math.round(parseFloat(s.price) * 100) : null,
      deposit_amount: s.deposit_amount ? Math.round(parseFloat(s.deposit_amount) * 100) : null,
      sort_order: i,
    }))

    const { error: insertError } = await supabase.from('services').insert(rows)
    if (insertError) { setError(insertError.message); setLoading(false); return }
    router.push('/onboarding/availability')
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Your services</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Add at least one service. Clients will choose from these when booking.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {services.map((service, i) => (
          <div key={i} className="card" style={{ marginBottom: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Service {i + 1}</span>
              {services.length > 1 && (
                <button type="button" onClick={() => removeService(i)}
                  style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}>×</button>
              )}
            </div>
            <div className="field">
              <label>Service name *</label>
              <input type="text" placeholder={i === 0 ? 'e.g. Full Sleeve Consultation, Balayage, Gel Full Set' : 'Service name'} value={service.name} onChange={e => update(i, 'name', e.target.value)} required />
            </div>
            <div className="field">
              <label>Description (optional)</label>
              <input type="text" placeholder="Brief description shown to clients" value={service.description} onChange={e => update(i, 'description', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="field">
                <label>Duration</label>
                <select value={service.duration_minutes} onChange={e => update(i, 'duration_minutes', parseInt(e.target.value))}>
                  {DURATION_OPTIONS.map(d => <option key={d} value={d}>{formatDuration(d)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Price (leave blank to hide)</label>
                <input type="number" placeholder="150.00" min="0" step="0.01" value={service.price} onChange={e => update(i, 'price', e.target.value)} />
              </div>
              <div className="field">
                <label>Deposit required</label>
                <input type="number" placeholder="50.00" min="0" step="0.01" value={service.deposit_amount} onChange={e => update(i, 'deposit_amount', e.target.value)} />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
              Deposit charged at booking via Stripe. Leave blank for no deposit.
            </p>
          </div>
        ))}

        <button type="button" className="btn-secondary" onClick={addService} style={{ marginBottom: '1rem' }}>
          + Add another service
        </button>

        {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
        <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => router.back()}>
          ← Back
        </button>
      </form>
    </div>
  )
}
