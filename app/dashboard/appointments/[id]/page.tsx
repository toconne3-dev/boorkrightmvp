'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface AppointmentDetail {
  id: string
  start_at: string
  end_at: string
  status: string
  deposit_required: number | null
  deposit_paid: boolean
  notes: string | null
  clients: { id: string; name: string; email: string; phone: string | null } | null
  services: { id: string; name: string; duration_minutes: number; price: number | null } | null
  consent_form_responses: {
    id: string
    responses: Record<string, string | boolean>
    signature_url: string | null
    signed_at: string | null
    consent_forms: { name: string; fields: { id: string; label: string; type: string }[] } | null
  }[]
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#22c55e',
  completed: '#6b7280',
  no_show: '#ef4444',
  cancelled: '#374151',
}

const STATUS_BG: Record<string, string> = {
  pending: 'rgba(245,158,11,0.12)',
  confirmed: 'rgba(34,197,94,0.12)',
  completed: 'rgba(107,114,128,0.12)',
  no_show: 'rgba(239,68,68,0.12)',
  cancelled: 'rgba(55,65,81,0.3)',
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [appt, setAppt] = useState<AppointmentDetail | null>(null)
  const [tz, setTz] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [flashMsg, setFlashMsg] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: artistData }, { data: apptData }] = await Promise.all([
        supabase.from('artists').select('timezone').eq('id', user.id).single(),
        supabase
          .from('appointments')
          .select(`
            id, start_at, end_at, status, deposit_required, deposit_paid, notes,
            clients(id, name, email, phone),
            services(id, name, duration_minutes, price),
            consent_form_responses(
              id, responses, signature_url, signed_at,
              consent_forms(name, fields)
            )
          `)
          .eq('id', id)
          .eq('artist_id', user.id)
          .single(),
      ])

      if (artistData?.timezone) setTz(artistData.timezone)
      if (!apptData) { setNotFound(true); setLoading(false); return }
      setAppt(apptData as unknown as AppointmentDetail)
      setLoading(false)
    }
    load()
  }, [id])

  async function updateStatus(newStatus: string) {
    setUpdating(true)
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    setUpdating(false)
    if (!res.ok) { alert(data.error || 'Failed to update status'); return }
    setAppt(prev => prev ? { ...prev, status: newStatus } : prev)
    setFlashMsg(newStatus === 'confirmed' ? '✓ Appointment confirmed — client notified' : `✓ Status updated to ${newStatus}`)
    setTimeout(() => setFlashMsg(''), 3000)
  }

  async function markDepositPaid() {
    setUpdating(true)
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deposit_paid: true }),
    })
    setUpdating(false)
    if (!res.ok) { alert('Failed to update deposit'); return }
    setAppt(prev => prev ? { ...prev, deposit_paid: true } : prev)
    setFlashMsg('✓ Deposit marked as received')
    setTimeout(() => setFlashMsg(''), 3000)
  }

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading…</div>
  )

  if (notFound) return (
    <div style={{ padding: '2rem', maxWidth: '560px' }}>
      <Link href="/dashboard/calendar" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none' }}>← Back to Calendar</Link>
      <p style={{ marginTop: '2rem', color: 'var(--muted-foreground)' }}>Appointment not found.</p>
    </div>
  )

  if (!appt) return null

  const startDate = new Date(appt.start_at)
  const endDate = new Date(appt.end_at)
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: tz })
  const startTime = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
  const endTime = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })
  const consentResponse = appt.consent_form_responses?.[0] ?? null

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Back link */}
      <Link href="/dashboard/calendar" style={{ color: 'var(--accent)', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1.5rem' }}>
        ← Calendar
      </Link>

      {/* Flash message */}
      {flashMsg && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.5rem', color: '#22c55e', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {flashMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700 }}>{appt.clients?.name}</h1>
          <span style={{
            padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600,
            background: STATUS_BG[appt.status] || 'var(--muted)',
            color: STATUS_COLOR[appt.status] || 'var(--foreground)',
            textTransform: 'capitalize', border: `1px solid ${STATUS_COLOR[appt.status] || 'var(--border)'}`,
          }}>
            {appt.status.replace('_', ' ')}
          </span>
        </div>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9375rem' }}>{appt.services?.name}</p>
      </div>

      {/* Appointment info card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem', color: 'var(--accent)' }}>Appointment</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Date</p>
            <p style={{ fontWeight: 500 }}>{dateStr}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Time</p>
            <p style={{ fontWeight: 500, fontFamily: 'monospace' }}>{startTime} – {endTime}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Duration</p>
            <p style={{ fontWeight: 500 }}>{appt.services?.duration_minutes} min</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price</p>
            <p style={{ fontWeight: 500 }}>
              {appt.services?.price ? `$${(appt.services.price / 100).toFixed(0)}` : 'On request'}
            </p>
          </div>
        </div>

        {/* Deposit row */}
        {appt.deposit_required && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deposit</p>
              <p style={{ fontWeight: 600, color: appt.deposit_paid ? '#22c55e' : 'var(--accent)' }}>
                ${(appt.deposit_required / 100).toFixed(0)} {appt.deposit_paid ? '✓ Received' : '· Pending'}
              </p>
            </div>
            {!appt.deposit_paid && (
              <button onClick={markDepositPaid} disabled={updating}
                style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                Mark received
              </button>
            )}
          </div>
        )}
      </div>

      {/* Client info card */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem', color: 'var(--accent)' }}>Client</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Name</span>
            <span style={{ fontWeight: 500 }}>{appt.clients?.name}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Email</span>
            <a href={`mailto:${appt.clients?.email}`} style={{ color: 'var(--accent)', fontSize: '0.875rem' }}>{appt.clients?.email}</a>
          </div>
          {appt.clients?.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Phone</span>
              <a href={`tel:${appt.clients.phone}`} style={{ color: 'var(--foreground)', fontSize: '0.875rem' }}>{appt.clients.phone}</a>
            </div>
          )}
          {appt.clients?.id && (
            <Link href={`/dashboard/clients/${appt.clients.id}`} style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', textDecoration: 'none', marginTop: '0.25rem' }}>
              View full client history →
            </Link>
          )}
        </div>
      </div>

      {/* Actions card */}
      {appt.status !== 'cancelled' && appt.status !== 'completed' && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {appt.status === 'pending' && (
              <button onClick={() => updateStatus('confirmed')} disabled={updating} className="btn-primary">
                {updating ? 'Updating…' : '✓ Confirm appointment'}
              </button>
            )}
            {appt.status === 'confirmed' && (
              <button onClick={() => updateStatus('completed')} disabled={updating}
                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #22c55e', background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 600 }}>
                {updating ? 'Updating…' : '✓ Mark as completed'}
              </button>
            )}
            {(appt.status === 'confirmed' || appt.status === 'pending') && (
              <button onClick={() => { if (confirm('Cancel this appointment?')) updateStatus('cancelled') }} disabled={updating}
                style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem' }}>
                Cancel appointment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Consent form responses */}
      {consentResponse && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem', color: 'var(--accent)' }}>
            {consentResponse.consent_forms?.name || 'Intake form'}
          </p>

          {consentResponse.signed_at && (
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              Signed {new Date(consentResponse.signed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {consentResponse.consent_forms?.fields?.map(field => {
              const answer = consentResponse.responses[field.id]
              if (answer === undefined || answer === null || answer === '') return null
              return (
                <div key={field.id} style={{ paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{field.label}</p>
                  <p style={{ fontSize: '0.9375rem' }}>
                    {typeof answer === 'boolean' ? (answer ? 'Yes' : 'No') : String(answer)}
                  </p>
                </div>
              )
            })}
          </div>

          {consentResponse.signature_url && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>Signature</p>
              <div style={{ background: 'var(--muted)', borderRadius: '0.5rem', padding: '0.5rem', border: '1px solid var(--border)' }}>
                <img src={consentResponse.signature_url} alt="Client signature" style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancelled state */}
      {appt.status === 'cancelled' && (
        <div style={{ padding: '1rem', background: 'rgba(55,65,81,0.3)', borderRadius: '0.75rem', border: '1px solid var(--border)', textAlign: 'center' }}>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>This appointment has been cancelled.</p>
        </div>
      )}
    </div>
  )
}
