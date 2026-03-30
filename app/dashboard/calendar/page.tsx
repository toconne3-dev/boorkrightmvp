'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type ViewMode = 'today' | 'week' | 'month'

interface Appointment {
  id: string
  start_at: string
  end_at: string
  status: string
  clients: { name: string } | null
  services: { name: string; duration_minutes: number } | null
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#22c55e',
  completed: '#6b7280',
  no_show: '#ef4444',
  cancelled: '#374151',
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
  })
}

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x
}
function endOfDay(d: Date) {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x
}
function getWeekStart(d: Date) {
  const day = d.getDay()
  const mon = new Date(d)
  mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  mon.setHours(0, 0, 0, 0)
  return mon
}
function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d
  })
}
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = (firstDay.getDay() + 6) % 7 // Mon-based
  const totalCells = startPad + lastDay.getDate()
  const rows = Math.ceil(totalCells / 7)
  return Array.from({ length: rows * 7 }, (_, i) => {
    const d = new Date(year, month, 1 - startPad + i)
    return { date: d, inMonth: d.getMonth() === month }
  })
}

const DAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState(new Date()) // anchor date for navigation
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [tz, setTz] = useState('America/New_York')
  const [loading, setLoading] = useState(true)

  // Load timezone once
  useEffect(() => {
    async function loadTz() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('artists').select('timezone').eq('id', user.id).single()
      if (data?.timezone) setTz(data.timezone)
    }
    loadTz()
  }, [])

  // Compute date range for current view + anchor
  const range = useCallback((): { start: Date; end: Date } => {
    if (view === 'today') {
      return { start: startOfDay(anchor), end: endOfDay(anchor) }
    }
    if (view === 'week') {
      const ws = getWeekStart(anchor)
      const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23, 59, 59, 999)
      return { start: ws, end: we }
    }
    // month
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }, [view, anchor])

  // Fetch appointments whenever view/anchor changes
  useEffect(() => {
    async function fetchAppts() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { start, end } = range()
      const { data } = await supabase
        .from('appointments')
        .select('id, start_at, end_at, status, clients(name), services(name, duration_minutes)')
        .eq('artist_id', user.id)
        .gte('start_at', start.toISOString())
        .lte('start_at', end.toISOString())
        .order('start_at')
      setAppointments((data as Appointment[]) || [])
      setLoading(false)
    }
    fetchAppts()
  }, [range])

  // Navigation
  function navigate(dir: 1 | -1) {
    setAnchor(prev => {
      const d = new Date(prev)
      if (view === 'today') d.setDate(d.getDate() + dir)
      else if (view === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }
  function goToday() { setAnchor(new Date()) }

  // Header label
  function headerLabel() {
    if (view === 'today') {
      return anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
    if (view === 'week') {
      const ws = getWeekStart(anchor)
      const we = new Date(ws); we.setDate(ws.getDate() + 6)
      const same = ws.getMonth() === we.getMonth()
      return same
        ? `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`
        : `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`
    }
    return `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
  }

  function apptsByDate(d: Date) {
    return appointments.filter(a => new Date(a.start_at).toDateString() === d.toDateString())
  }

  const isToday = (d: Date) => d.toDateString() === new Date().toDateString()
  const isAnchorToday = anchor.toDateString() === new Date().toDateString()

  // ─── TODAY VIEW ───────────────────────────────────────────
  function TodayView() {
    return (
      <div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>Loading…</div>
        ) : appointments.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🗓️</p>
            <p style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}>Nothing scheduled</p>
            <p style={{ fontSize: '0.875rem' }}>No appointments for this day.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {appointments.map(appt => (
              <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ textAlign: 'center', minWidth: '4.5rem', flexShrink: 0 }}>
                    <p style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.125rem' }}>{formatTime(appt.start_at, tz)}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{appt.services?.duration_minutes} min</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{appt.clients?.name}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>{appt.services?.name}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLOR[appt.status] || '#fff', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
                      {appt.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── WEEK VIEW ────────────────────────────────────────────
  function WeekView() {
    const weekDays = getWeekDays(getWeekStart(anchor))
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
          {weekDays.map((day, i) => {
            const dayAppts = apptsByDate(day)
            return (
              <div key={day.toDateString()}>
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.3rem' }}>{DAY_LABELS_SHORT[i]}</p>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '50%', display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem',
                    fontWeight: isToday(day) ? 700 : 400,
                    background: isToday(day) ? 'var(--accent)' : 'transparent',
                    color: isToday(day) ? '#0a0a0a' : 'var(--foreground)',
                  }}>
                    {day.getDate()}
                  </div>
                </div>
                <div style={{ minHeight: '140px', background: 'var(--card)', border: `1px solid ${isToday(day) ? 'rgba(200,169,126,0.4)' : 'var(--border)'}`, borderRadius: '0.5rem', padding: '0.375rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {loading ? (
                    <p style={{ fontSize: '0.65rem', color: 'var(--border)', textAlign: 'center', marginTop: '1rem' }}>…</p>
                  ) : dayAppts.length === 0 ? (
                    <p style={{ fontSize: '0.65rem', color: 'var(--border)', textAlign: 'center', marginTop: '1rem' }}>—</p>
                  ) : dayAppts.map(appt => (
                    <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ background: 'var(--muted)', borderRadius: '0.25rem', padding: '0.3rem 0.4rem', borderLeft: `3px solid ${STATUS_COLOR[appt.status] || '#fff'}`, cursor: 'pointer' }}>
                        <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                          {formatTime(appt.start_at, tz)}
                        </p>
                        <p style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {appt.clients?.name?.split(' ')[0]}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── MONTH VIEW ───────────────────────────────────────────
  function MonthView() {
    const cells = getMonthDays(anchor.getFullYear(), anchor.getMonth())
    return (
      <div>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.25rem' }}>
          {DAY_LABELS_SHORT.map(d => (
            <p key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', padding: '0.375rem 0', fontWeight: 500 }}>{d}</p>
          ))}
        </div>
        {/* Day cells */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
          {cells.map(({ date, inMonth }, i) => {
            const dayAppts = apptsByDate(date)
            return (
              <div key={i} style={{
                minHeight: '80px', background: inMonth ? 'var(--card)' : 'transparent',
                border: `1px solid ${isToday(date) ? 'rgba(200,169,126,0.5)' : inMonth ? 'var(--border)' : 'transparent'}`,
                borderRadius: '0.5rem', padding: '0.375rem', opacity: inMonth ? 1 : 0.3,
              }}>
                <p style={{
                  fontSize: '0.8125rem', fontWeight: isToday(date) ? 700 : 400,
                  color: isToday(date) ? 'var(--accent)' : inMonth ? 'var(--foreground)' : 'var(--muted-foreground)',
                  marginBottom: '0.25rem', textAlign: 'right',
                }}>
                  {date.getDate()}
                </p>
                {!loading && dayAppts.slice(0, 3).map(appt => (
                  <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div style={{ background: 'var(--muted)', borderRadius: '0.2rem', padding: '0.125rem 0.3rem', marginBottom: '0.2rem', borderLeft: `2px solid ${STATUS_COLOR[appt.status] || '#fff'}` }}>
                      <p style={{ fontSize: '0.65rem', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                        {formatTime(appt.start_at, tz)} {appt.clients?.name?.split(' ')[0]}
                      </p>
                    </div>
                  </Link>
                ))}
                {dayAppts.length > 3 && (
                  <p style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>+{dayAppts.length - 3} more</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Calendar</h1>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '0.5rem', padding: '3px', gap: '2px', border: '1px solid var(--border)' }}>
          {(['today', 'week', 'month'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => { setView(v); if (v === 'today') setAnchor(new Date()) }}
              style={{
                padding: '0.375rem 0.875rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer',
                fontSize: '0.875rem', fontWeight: view === v ? 600 : 400,
                background: view === v ? 'var(--card)' : 'transparent',
                color: view === v ? 'var(--foreground)' : 'var(--muted-foreground)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button onClick={() => navigate(-1)}
          style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ‹
        </button>
        <button onClick={() => navigate(1)}
          style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ›
        </button>
        <span style={{ fontWeight: 600, fontSize: '0.9375rem', flex: 1 }}>{headerLabel()}</span>
        {!isAnchorToday && (
          <button onClick={goToday}
            style={{ padding: '0.375rem 0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
            Today
          </button>
        )}
      </div>

      {/* View content */}
      {view === 'today' && <TodayView />}
      {view === 'week' && <WeekView />}
      {view === 'month' && <MonthView />}

      {/* Legend (week + month only) */}
      {view !== 'today' && (
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
          {Object.entries(STATUS_COLOR).map(([status, color]) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: color }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
