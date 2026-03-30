'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BlockedTime {
  id: string
  start_at: string
  end_at: string
  reason: string | null
}

// Today's date as YYYY-MM-DD in local time
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Format a blocked time for display
function formatBlock(block: BlockedTime, tz: string) {
  const start = new Date(block.start_at)
  const end = new Date(block.end_at)

  const startDate = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
  const endDate = end.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
  const startTime = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
  const endTime = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })

  // Check if it's a full day (00:00 – 23:59 in the artist's timezone)
  const isFullDay = startTime === '00:00' && endTime === '23:59'

  if (isFullDay) {
    return startDate === endDate ? startDate : `${startDate} – ${endDate}`
  }
  return startDate === endDate
    ? `${startDate}, ${startTime} – ${endTime}`
    : `${startDate} ${startTime} – ${endDate} ${endTime}`
}

// Convert a local date string + time string to UTC ISO, given a timezone
// We build a date string that we interpret as being in the artist's timezone
function toUtcIso(dateStr: string, timeStr: string, tz: string): string {
  // Use Intl to find the UTC offset for that date/time in the tz
  const localDt = `${dateStr}T${timeStr}:00`
  // Parse it naively as local, then correct for tz offset
  const naive = new Date(localDt)
  // Get what the local time would read in the target tz
  const tzDate = new Date(naive.toLocaleString('en-US', { timeZone: tz }))
  const diff = naive.getTime() - tzDate.getTime()
  return new Date(naive.getTime() + diff).toISOString()
}

export default function BlockedTimesPage() {
  const [blocks, setBlocks] = useState<BlockedTime[]>([])
  const [tz, setTz] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [blockType, setBlockType] = useState<'full_day' | 'time_range'>('full_day')
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState(todayStr())
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reason, setReason] = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: artistData }, { data: blockData }] = await Promise.all([
      supabase.from('artists').select('timezone').eq('id', user.id).single(),
      supabase
        .from('blocked_times')
        .select('id, start_at, end_at, reason')
        .eq('artist_id', user.id)
        .gte('end_at', new Date().toISOString()) // only future/current blocks
        .order('start_at'),
    ])

    if (artistData?.timezone) setTz(artistData.timezone)
    setBlocks(blockData || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function resetForm() {
    setBlockType('full_day')
    setStartDate(todayStr())
    setEndDate(todayStr())
    setStartTime('09:00')
    setEndTime('17:00')
    setReason('')
    setError('')
    setShowForm(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Validate dates
    if (endDate < startDate) {
      setError('End date cannot be before start date.')
      return
    }
    if (blockType === 'time_range' && startDate === endDate && endTime <= startTime) {
      setError('End time must be after start time.')
      return
    }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let startIso: string
    let endIso: string

    if (blockType === 'full_day') {
      startIso = toUtcIso(startDate, '00:00', tz)
      endIso = toUtcIso(endDate, '23:59', tz)
    } else {
      startIso = toUtcIso(startDate, startTime, tz)
      endIso = toUtcIso(endDate === startDate ? startDate : endDate, endTime, tz)
    }

    const { error: insertError } = await supabase.from('blocked_times').insert({
      artist_id: user.id,
      start_at: startIso,
      end_at: endIso,
      reason: reason.trim() || null,
    })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('blocked_times').delete().eq('id', id)
    setDeleting(null)
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  // Group blocks: upcoming (future start) vs active (started but not ended)
  const now = new Date()
  const activeBlocks = blocks.filter(b => new Date(b.start_at) <= now)
  const upcomingBlocks = blocks.filter(b => new Date(b.start_at) > now)

  return (
    <div style={{ maxWidth: '620px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Blocked Times</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Block off days or hours when you&apos;re unavailable. Clients won&apos;t be able to book during these times.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
            + Add block
          </button>
        )}
      </div>

      {/* Add block form */}
      {showForm && (
        <form onSubmit={handleAdd}>
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(200,169,126,0.3)' }}>
            <p style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.9375rem' }}>New blocked time</p>

            {/* Type toggle */}
            <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '0.5rem', padding: '3px', gap: '2px', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
              {(['full_day', 'time_range'] as const).map(t => (
                <button key={t} type="button" onClick={() => setBlockType(t)}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                    fontSize: '0.875rem', fontWeight: blockType === t ? 600 : 400,
                    background: blockType === t ? 'var(--card)' : 'transparent',
                    color: blockType === t ? 'var(--foreground)' : 'var(--muted-foreground)',
                    transition: 'all 0.15s',
                  }}>
                  {t === 'full_day' ? '🗓 Full day' : '⏱ Time range'}
                </button>
              ))}
            </div>

            {blockType === 'full_day' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Start date</label>
                  <input type="date" value={startDate} min={todayStr()} onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }} required />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>End date</label>
                  <input type="date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required />
                </div>
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={startDate} min={todayStr()} onChange={e => setStartDate(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>Start time</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label>End time</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            <div className="field" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <label>Reason (optional)</label>
              <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Vacation, Personal day, Out of town" />
            </div>

            {error && <p className="error-text" style={{ marginTop: '0.75rem' }}>{error}</p>}

            <div style={{ display: 'flex', gap: '0.625rem', marginTop: '1.25rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save block'}
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted-foreground)', padding: '2rem', textAlign: 'center' }}>Loading…</div>
      ) : blocks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</p>
          <p style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}>No blocked times</p>
          <p style={{ fontSize: '0.875rem' }}>You&apos;re open for bookings. Add a block when you need time off.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Active blocks */}
          {activeBlocks.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Active now</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeBlocks.map(block => (
                  <BlockRow key={block.id} block={block} tz={tz} deleting={deleting} onDelete={handleDelete} active />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming blocks */}
          {upcomingBlocks.length > 0 && (
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.625rem' }}>Upcoming</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {upcomingBlocks.map(block => (
                  <BlockRow key={block.id} block={block} tz={tz} deleting={deleting} onDelete={handleDelete} active={false} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BlockRow({
  block, tz, deleting, onDelete, active,
}: {
  block: BlockedTime; tz: string; deleting: string | null; onDelete: (id: string) => void; active: boolean
}) {
  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.125rem',
      borderLeft: active ? '3px solid #f59e0b' : '3px solid var(--border)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '0.125rem' }}>
          {formatBlock(block, tz)}
        </p>
        {block.reason && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{block.reason}</p>
        )}
        {active && (
          <p style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.25rem', fontWeight: 500 }}>Active now</p>
        )}
      </div>
      <button
        onClick={() => onDelete(block.id)}
        disabled={deleting === block.id}
        style={{
          background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted-foreground)',
          padding: '0.375rem 0.75rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8125rem',
          flexShrink: 0, transition: 'all 0.15s',
        }}>
        {deleting === block.id ? '…' : 'Remove'}
      </button>
    </div>
  )
}
