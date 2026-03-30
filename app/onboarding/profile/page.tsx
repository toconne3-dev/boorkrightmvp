'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PROFESSIONS = [
  { value: 'tattoo', label: 'Tattoo Artist' },
  { value: 'hair', label: 'Hairstylist' },
  { value: 'nails', label: 'Nail Tech' },
  { value: 'lash', label: 'Lash Tech' },
  { value: 'esthetics', label: 'Esthetician' },
  { value: 'piercing', label: 'Body Piercer' },
  { value: 'other', label: 'Other' },
]

export default function OnboardingProfile() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', business_name: '', bio: '', profession_type: '', city: '', booking_slug: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (field === 'booking_slug') setSlugAvailable(null)
  }

  function suggestSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function checkSlug() {
    if (!form.booking_slug) return
    const supabase = createClient()
    const { data } = await supabase.from('artists').select('id').eq('booking_slug', form.booking_slug).maybeSingle()
    setSlugAvailable(!data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.profession_type) { setError('Please select your profession.'); return }
    if (!form.booking_slug) { setError('Please set your booking link handle.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { error: updateError } = await supabase.from('artists').update({
      name: form.name,
      business_name: form.business_name,
      bio: form.bio,
      profession_type: form.profession_type,
      city: form.city,
      booking_slug: form.booking_slug,
    }).eq('id', user.id)

    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.push('/onboarding/services')
  }

  return (
    <div className="card">
      <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Tell us about you</h1>
      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>This info appears on your public booking page.</p>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Your name *</label>
          <input type="text" placeholder="Alex Rivera" value={form.name} onChange={e => { set('name', e.target.value); if (!form.booking_slug) set('booking_slug', suggestSlug(e.target.value)) }} required />
        </div>
        <div className="field">
          <label>Studio / business name</label>
          <input type="text" placeholder="Inkwell Studio" value={form.business_name} onChange={e => set('business_name', e.target.value)} />
        </div>
        <div className="field">
          <label>Profession *</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {PROFESSIONS.map(p => (
              <button key={p.value} type="button"
                onClick={() => set('profession_type', p.value)}
                style={{
                  padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid',
                  borderColor: form.profession_type === p.value ? 'var(--accent)' : 'var(--border)',
                  background: form.profession_type === p.value ? 'rgba(200,169,126,0.12)' : 'var(--muted)',
                  color: form.profession_type === p.value ? 'var(--accent)' : 'var(--muted-foreground)',
                  fontWeight: form.profession_type === p.value ? 600 : 400,
                  fontSize: '0.875rem', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Short bio</label>
          <textarea rows={3} placeholder="7 years tattooing in Atlanta. Specializing in blackwork and fine line." value={form.bio} onChange={e => set('bio', e.target.value)} style={{ resize: 'vertical' }} />
        </div>
        <div className="field">
          <label>City</label>
          <input type="text" placeholder="Atlanta, GA" value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div className="field">
          <label>Your booking link handle *</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>bookright.app/</span>
            <input type="text" placeholder="alex-ink" value={form.booking_slug}
              onChange={e => set('booking_slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              onBlur={checkSlug} style={{ flex: 1 }} required />
          </div>
          {slugAvailable === true && <p className="success-text">✓ This handle is available</p>}
          {slugAvailable === false && <p className="error-text">This handle is already taken. Try another.</p>}
        </div>

        {error && <p className="error-text" style={{ marginBottom: '1rem' }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
      </form>
    </div>
  )
}
