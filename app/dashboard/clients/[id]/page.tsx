'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  created_at: string
}

interface Appointment {
  id: string
  start_at: string
  end_at: string
  status: string
  services: { name: string; duration_minutes: number } | null
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#22c55e',
  completed: '#6b7280',
  no_show: '#ef4444',
  cancelled: '#374151',
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [tz, setTz] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: artistData }, { data: clientData }, { data: apptData }] = await Promise.all([
        supabase.from('artists').select('timezone').eq('id', user.id).single(),
        supabase.from('clients').select('id,name,email,phone,created_at').eq('id', id).eq('artist_id', user.id).single(),
        supabase
          .from('appointments')
          .select('id,start_at,end_at,status,services(name,duration_minutes)')
          .eq('client_id', id)
          .order('start_at', { ascending: false }),
      ])

      if (artistData?.timezone) setTz(artistData.timezone)
      if (!clientData) { setNotFound(true); setLoading(false); return }
      setClient(clientData)
      setAppointments((apptData || []) as Appointment[])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>
  )

  if (notFound) return (
    <div style={{ padding: '2rem', maxWidth: '560px' }}>
      <Link href="/dashboard/clients" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>← Back to Clients</Link>
      <p style={{ marginTop: '2rem', color: 'var(--muted-foreground)' }}>Client not found.</p>
    </div>
  )

  if (!client) return null

  const upcoming = appointments.filter(a => new Date(a.start_at) > new Date() && a.status !== 'cancelled')
  const past = appointments.filter(a => new Date(a.start_at) <= new Date() || a.status === 'cancelled')

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
  }
  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: tz })
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <Link href="/dashboard/clients" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}>
        ← Clients
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{
          width: '3rem', height: '3rem', borderRadius: '50%', background: 'var(--muted)',
          border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent)', flexShrink: 0,
        }}>
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.125rem' }}>{client.name}</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Client since {new Date(client.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Contact info */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem', color: 'var(--accent)' }}>Contact</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Email</span>
            <a href={`mailto:${client.email}`} style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{client.email}</a>
          </div>
          {client.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Phone</span>
              <a href={`tel:${client.phone}`} style={{ color: 'var(--foreground)', fontSize: '0.875rem' }}>{client.phone}</a>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{appointments.length}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>total visits</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.75rem', fontWeight: 800, color: '#22c55e' }}>{upcoming.length}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>upcoming</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <p style={{ fontSize: '1.75rem', fontWeight: 800 }}>{past.filter(a => a.status === 'completed').length}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>completed</p>
        </div>
      </div>

      {/* Appointment history */}
      <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.875rem' }}>Appointment history</h2>
      {appointments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
          No appointments yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {appointments.map(appt => (
            <Link key={appt.id} href={`/dashboard/appointments/${appt.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', minWidth: '4rem' }}>
                    <p style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.9375rem' }}>{formatTime(appt.start_at)}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>{formatDate(appt.start_at)}</p>
                  </div>
                  <div>
                    <p style={{ fontWeight: 500 }}>{appt.services?.name || 'Service'}</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>{appt.services?.duration_minutes} min</p>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.625rem', borderRadius: '999px',
                  background: 'rgba(0,0,0,0.3)', color: STATUS_COLOR[appt.status] || '#fff', textTransform: 'capitalize',
                }}>
                  {appt.status.replace('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
