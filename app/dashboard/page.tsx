import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import CopyBookingLink from './_components/CopyBookingLink'

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
}

export default async function DashboardHome() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: artist } = await supabase.from('artists').select('*').eq('id', user.id).single()
  if (!artist) redirect('/auth/login')
  if (!artist.onboarding_complete) redirect('/onboarding/profile')

  // Today's appointments
  const today = new Date()
  const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
  const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString()

  const { data: todayAppts } = await supabase
    .from('appointments')
    .select('*, clients(name, email, phone), services(name, duration_minutes)')
    .eq('artist_id', user.id)
    .gte('start_at', startOfDay)
    .lte('start_at', endOfDay)
    .neq('status', 'cancelled')
    .order('start_at')

  // Upcoming this week
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const { count: weekCount } = await supabase
    .from('appointments')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', user.id)
    .gte('start_at', new Date().toISOString())
    .lte('start_at', weekEnd.toISOString())
    .neq('status', 'cancelled')

  const tz = artist.timezone || 'America/New_York'
  const bookingUrl = `bookright.app/${artist.booking_slug}`

  const STATUS_COLORS: Record<string, string> = {
    pending: '#f59e0b', confirmed: '#22c55e', completed: '#6b7280', no_show: '#ef4444',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {artist.name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <CopyBookingLink bookingUrl={bookingUrl} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Today</p>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{todayAppts?.length || 0}</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>appointment{todayAppts?.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>This week</p>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{weekCount || 0}</p>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>upcoming</p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '0.25rem' }}>Plan</p>
          <p style={{ fontSize: '1.375rem', fontWeight: 800, color: artist.plan === 'pro' ? 'var(--accent)' : 'var(--foreground)' }}>
            {artist.plan === 'pro' ? 'Pro ⚡' : 'Free'}
          </p>
          {artist.plan === 'free' && <Link href="/dashboard/upgrade" style={{ color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 500 }}>Upgrade →</Link>}
        </div>
      </div>

      {/* Today's schedule */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1.0625rem' }}>Today&apos;s schedule</h2>
        {!todayAppts?.length ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-foreground)' }}>
            <p style={{ marginBottom: '1rem' }}>No appointments today.</p>
            <p style={{ fontSize: '0.875rem' }}>Share your booking link to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {todayAppts.map((appt: Record<string, unknown>) => {
              const client = appt.clients as { name: string; phone: string } | null
              const service = appt.services as { name: string; duration_minutes: number } | null
              return (
                <Link key={appt.id as string} href={`/dashboard/appointments/${appt.id}`}
                  style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', minWidth: '4rem' }}>
                        <p style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '1.0625rem' }}>{formatTime(appt.start_at as string, tz)}</p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{service?.duration_minutes} min</p>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{client?.name}</p>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>{service?.name}</p>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '999px', background: 'rgba(0,0,0,0.3)', color: STATUS_COLORS[appt.status as string] || '#fff' }}>
                      {(appt.status as string).charAt(0).toUpperCase() + (appt.status as string).slice(1)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1.0625rem' }}>Quick actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { href: '/dashboard/availability', label: 'Manage availability', icon: '🕐' },
            { href: '/dashboard/services', label: 'Edit services', icon: '✂️' },
            { href: '/dashboard/forms', label: 'Edit consent forms', icon: '📋' },
            { href: '/dashboard/clients', label: 'View clients', icon: '👥' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', cursor: 'pointer' }}>
                <span style={{ fontSize: '1.25rem' }}>{a.icon}</span>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
