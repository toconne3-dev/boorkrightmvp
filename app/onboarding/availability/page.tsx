'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST/AKDT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
]

interface DayRule { enabled: boolean; start: string; end: string }

const defaultRules = (): DayRule[] => DAYS.map((_, i) => ({
  enabled: i >= 1 && i <= 5, // Mon–Fri on by default
  start: '09:00',
  end: '17:00',
}))

export default function OnboardingAvailability() {
  const router = useRouter()
  const [rules, setRules] = useState<DayRule[]>(defaultRules())
  const [timezone, setTimezone] = useState('America/New_York')
  const [buffer, setBuffer] = useState(0)
  const [advanceDays, setAdvanceDays] = useState(60)
  const [minNotice, setMinNotice] = useState(24)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleDay(i: number) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  }
  function setTime(i: number, field: 'start' | 'end', value: string) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rules.some(r => r.enabled)) { setError('Please enable at least one day.'); return }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // Update artist settings
    await supabase.from('artists').update({
      timezone,
      buffer_minutes: buffer,
      advance_booking_days: advanceDays,
      min_notice_hours: minNotice,
    }).eq('id', user.id)

    // Insert availability rules
    const rows = rules.map((r, i) => ({
      artist_id: user.id,
      day_of_week: i,
      start_time: r.start,
      end_time: r.end,
      is_available: r.enabled,
    }))
    const { error: insertError } = await supabase.from('availability_rules').insert(rows)
    if (insertError) { setError(insertError.message); setLoading(false); return }

    router.push('/onboarding/consent-form')
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.375rem' }}>Your availability</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>All times are in 24-hour (military) format.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="field">
            <label>Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
            </select>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', marginTop: '0.375rem' }}>Defaults to Eastern. All booking times display in this timezone.</p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>Weekly schedule</p>
          {DAYS.map((day, i) => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
              {/* Toggle */}
              <label className="toggle" style={{ flexShrink: 0 }}>
                <input type="checkbox" checked={rules[i].enabled} onChange={() => toggleDay(i)} />
                <span className="toggle-slider" />
              </label>
              <span style={{ width: '2.5rem', fontWeight: 500, fontSize: '0.9375rem', color: rules[i].enabled ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{day}</span>
              {rules[i].enabled ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                  <input type="time" value={rules[i].start} onChange={e => setTime(i, 'start', e.target.value)}
                    style={{ width: '7rem', fontFamily: 'monospace' }} />
                  <span style={{ color: 'var(--muted-foreground)' }}>to</span>
                  <input type="time" value={rules[i].end} onChange={e => setTime(i, 'end', e.target.value)}
                    style={{ width: '7rem', fontFamily: 'monospace' }} />
                </div>
              ) : (
                <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Unavailable</span>
              )}
            </div>
          ))}
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>Booking rules</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
            <div className="field">
              <label>Buffer between appointments</label>
              <select value={buffer} onChange={e => setBuffer(parseInt(e.target.value))}>
                <option value={0}>No buffer</option>
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={60}>1 hr</option>
              </select>
            </div>
            <div className="field">
              <label>How far ahead can clients book?</label>
              <select value={advanceDays} onChange={e => setAdvanceDays(parseInt(e.target.value))}>
                <option value={7}>1 week</option>
                <option value={14}>2 weeks</option>
                <option value={30}>1 month</option>
                <option value={60}>2 months</option>
                <option value={90}>3 months</option>
                <option value={180}>6 months</option>
              </select>
            </div>
            <div className="field">
              <label>Minimum booking notice</label>
              <select value={minNotice} onChange={e => setMinNotice(parseInt(e.target.value))}>
                <option value={0}>Same day</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={168}>1 week</option>
              </select>
            </div>
          </div>
        </div>

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
