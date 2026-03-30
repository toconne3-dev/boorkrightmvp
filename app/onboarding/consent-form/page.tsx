'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Template { id: string; name: string; profession_type: string; fields: unknown[] }

export default function OnboardingConsentForm() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [artistProfession, setArtistProfession] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: artist }, { data: tpls }] = await Promise.all([
        supabase.from('artists').select('profession_type').eq('id', user.id).single(),
        supabase.from('consent_forms').select('*').eq('is_template', true),
      ])

      if (artist) setArtistProfession(artist.profession_type || '')
      if (tpls) {
        setTemplates(tpls)
        // Auto-select the matching profession template
        const match = tpls.find(t => t.profession_type === artist?.profession_type)
        if (match) setSelected(match.id)
      }
      setFetching(false)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Copy the template as the artist's active form
    const template = templates.find(t => t.id === selected)
    if (template) {
      await supabase.from('consent_forms').insert({
        artist_id: user.id,
        name: template.name,
        is_template: false,
        profession_type: template.profession_type,
        fields: template.fields,
      })
    }

    router.push('/onboarding/booking-link')
  }

  const professionLabels: Record<string, string> = {
    tattoo: 'Tattoo Artist', hair: 'Hairstylist', nails: 'Nail Tech',
    lash: 'Lash Tech', esthetics: 'Esthetician', piercing: 'Body Piercer', other: 'Other',
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Choose a consent form</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: 1.5 }}>
          Clients fill this out before every appointment. Pick the template that fits your work best.
          You can customize it later.
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ background: 'rgba(200,169,126,0.08)', border: '1px solid rgba(200,169,126,0.25)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--accent)' }}>Note:</strong> These templates are provided as tools only — not legal advice.
          You are responsible for ensuring your consent forms comply with the laws in your area.
          BookRight is not a HIPAA-covered entity; any client health information collected is your responsibility to manage appropriately.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {fetching ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading templates…</div>
          ) : templates.map(t => (
            <button key={t.id} type="button"
              onClick={() => setSelected(t.id)}
              style={{
                textAlign: 'left', padding: '1rem 1.25rem', borderRadius: '0.75rem',
                border: '1px solid', borderColor: selected === t.id ? 'var(--accent)' : 'var(--border)',
                background: selected === t.id ? 'rgba(200,169,126,0.1)' : 'var(--card)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: selected === t.id ? 'var(--accent)' : 'var(--foreground)' }}>{t.name}</p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{(t.fields as unknown[]).length} questions</p>
                </div>
                {t.profession_type === artistProfession && (
                  <span style={{ fontSize: '0.75rem', background: 'rgba(200,169,126,0.15)', color: 'var(--accent)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                    Recommended for {professionLabels[artistProfession] || 'you'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary" disabled={!selected || loading}>
          {loading ? 'Saving…' : 'Continue →'}
        </button>
        <button type="button" className="btn-secondary" style={{ marginTop: '0.75rem' }} onClick={() => router.back()}>
          ← Back
        </button>
      </form>
    </div>
  )
}
