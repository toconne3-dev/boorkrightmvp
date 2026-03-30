'use client'
import { useState, useEffect } from 'react'
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

interface DayRule { id?: string; enabled: boolean; start: string; end: string }

export default function AvailabilityPage() {
  const [rules, setRules] = useState<DayRule[]>(DAYS.map(() => ({ enabled: false, start: '09:00', end: '17:00' })))
  const [timezone, setTimezone] = useState('America/New_York')
  const [buffer, setBuffer] = useState(0)
  const [advanceDays, setAdvanceDays] = useState(60)
  const [minNotice, setMinNotice] = useState(24)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: artist }, { data: avail }] = await Promise.all([
        supabase.from('artists').select('timezone,buffer_minutes,advance_booking_days,min_notice_hours').eq('id', user.id).single(),
        supabase.from('availability_rules').select('*').eq('artist_id', user.id).order('day_of_week'),
      ])

      if (artist) {
        setTimezone(artist.timezone || 'America/New_York')
        setBuffer(artist.buffer_minutes || 0)
        setAdvanceDays(artist.advance_booking_days || 60)
        setMinNotice(artist.min_notice_hours || 24)
      }

      if (avail?.length) {
        const newRules: DayRule[] = DAYS.map((_, i) => {
          const rule = avail.find(r => r.day_of_week === i)
          return rule ? { id: rule.id, enabled: rule.is_available, start: rule.start_time.slice(0,5), end: rule.end_time.slice(0,5) }
                      : { enabled: false, start: '09:00', end: '17:00' }
        })
        setRules(newRules)
      }
      setLoading(false)
    }
    load()
  }, [])

  function toggleDay(i: number) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, enabled: !r.enabled } : r))
  }
  function setTime(i: number, field: 'start' | 'end', value: string) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Update artist settings
    await supabase.from('artists').update({ timezone, buffer_minutes: buffer, advance_booking_days: advanceDays, min_notice_hours: minNotice }).eq('id', user.id)

    // Upsert availability rules
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]
      if (r.id) {
        await supabase.from('availability_rules').update({ start_time: r.start, end_time: r.end, is_available: r.enabled }).eq('id', r.id)
      } else {
        await supabase.from('availability_rules').insert({ artist_id: user.id, day_of_week: i, start_time: r.start, end_time: r.end, is_available: r.enabled })
      }
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: '2rem' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Availability</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>All times in 24-hour (military) format.</p>
        </div>
        <button className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save changes'}
        </button>
      </div>

      {/* Timezone */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)}>
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      {/* Weekly schedule */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>Weekly schedule</p>
        {DAYS.map((day, i) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
            <label className="toggle" style={{ flexShrink: 0 }}>
              <input type="checkbox" checked={rules[i].enabled} onChange={() => toggleDay(i)} />
              <span className="toggle-slider" />
            </label>
            <span style={{ width: '2.5rem', fontWeight: 500, fontSize: '0.9375rem', color: rules[i].enabled ? 'var(--foreground)' : 'var(--muted-foreground)' }}>{day}</span>
            {rules[i].enabled ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                <input type="time" value={rules[i].start} onChange={e => setTime(i, 'start', e.target.value)} style={{ width: '7.5rem', fontFamily: 'monospace' }} />
                <span style={{ color: 'var(--muted-foreground)' }}>to</span>
                <input type="time" value={rules[i].end} onChange={e => setTime(i, 'end', e.target.value)} style={{ width: '7.5rem', fontFamily: 'monospace' }} />
              </div>
            ) : (
              <span style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Unavailable</span>
            )}
          </div>
        ))}
      </div>

      {/* Booking rules */}
      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>Booking rules</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem' }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Buffer between appointments</label>
            <select value={buffer} onChange={e => setBuffer(parseInt(e.target.value))}>
              <option value={0}>No buffer</option>
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hr</option>
            </select>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
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
          <div className="field" style={{ marginBottom: 0 }}>
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
    </div>
  )
}
