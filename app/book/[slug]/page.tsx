'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { use } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Artist {
  id: string; name: string; business_name: string | null; bio: string | null
  profession_type: string; city: string | null; profile_photo_url: string | null
  timezone: string; advance_booking_days: number
  deposit_method: string | null; deposit_handle: string | null; deposit_instructions: string | null
}
interface Service { id: string; name: string; description: string | null; duration_minutes: number; price: number | null; deposit_amount: number | null }
interface Slot { time: string; iso: string }
interface FormField { id: string; type: string; label: string; required: boolean; options?: string[] }

type Step = 'service' | 'date' | 'time' | 'info' | 'consent' | 'signature' | 'deposit' | 'confirm'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}min` : `${h}hr`
}
function formatPrice(cents: number | null) {
  if (cents === null) return 'Price on request'
  return `$${(cents / 100).toFixed(0)}`
}
function formatDate(d: Date) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function getDaysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate() }
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay()
  return (d + 6) % 7 // Mon = 0
}
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PROFESSION_LABELS: Record<string, string> = {
  tattoo: 'Tattoo Artist', hair: 'Hairstylist', nails: 'Nail Tech',
  lash: 'Lash Tech', esthetics: 'Esthetician', piercing: 'Body Piercer', other: 'Artist'
}
const METHOD_LABELS: Record<string, string> = {
  venmo: 'Venmo', cashapp: 'Cash App', zelle: 'Zelle', paypal: 'PayPal', other: 'their preferred method'
}

// ─── Step indicator ───────────────────────────────────────────────────────────
const STEPS: Step[] = ['service', 'date', 'time', 'info', 'consent', 'signature', 'deposit', 'confirm']
const STEP_LABELS: Record<Step, string> = {
  service: 'Service', date: 'Date', time: 'Time', info: 'Your info',
  consent: 'Intake form', signature: 'Sign', deposit: 'Deposit', confirm: 'Confirmed'
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)

  const [artist, setArtist] = useState<Artist | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [consentForm, setConsentForm] = useState<{ id: string; name: string; fields: FormField[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Booking state
  const [step, setStep] = useState<Step>('service')
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() } })
  const [clientInfo, setClientInfo] = useState({ name: '', email: '', phone: '' })
  const [formAnswers, setFormAnswers] = useState<Record<string, string | boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [confirmation, setConfirmation] = useState<{ startAt: string; serviceName: string; clientName: string } | null>(null)

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Load artist + services + consent form
  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: artistData } = await supabase
        .from('artists')
        .select('id,name,business_name,bio,profession_type,city,profile_photo_url,timezone,advance_booking_days,deposit_method,deposit_handle,deposit_instructions')
        .eq('booking_slug', slug)
        .single()

      if (!artistData) { setNotFound(true); setLoading(false); return }
      setArtist(artistData)

      const [{ data: svcData }, { data: formData }] = await Promise.all([
        supabase.from('services').select('*').eq('artist_id', artistData.id).eq('is_active', true).order('sort_order'),
        supabase.from('consent_forms').select('id,name,fields').eq('artist_id', artistData.id).eq('is_template', false).order('created_at').limit(1).single(),
      ])

      setServices(svcData || [])
      if (formData) setConsentForm(formData as { id: string; name: string; fields: FormField[] })
      setLoading(false)
    }
    load()
  }, [slug])

  // Fetch slots when date + service selected
  useEffect(() => {
    if (!selectedDate || !selectedService || !slug) return
    setLoadingSlots(true)
    setSlots([])
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    fetch(`/api/book/${slug}/slots?date=${dateStr}&serviceId=${selectedService.id}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots || []); setLoadingSlots(false) })
      .catch(() => setLoadingSlots(false))
  }, [selectedDate, selectedService, slug])

  // Signature canvas helpers
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top }
  }
  function startSign(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const canvas = canvasRef.current; if (!canvas) return
    setIsSigning(true)
    lastPos.current = getPos(e, canvas)
  }
  function drawSign(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isSigning) return
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.strokeStyle = '#c8a97e'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setHasSigned(true)
  }
  function endSign() { setIsSigning(false); lastPos.current = null }
  function clearSignature() {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  // Finalize booking (no payment processing — deposit is manual)
  async function finalizeBooking() {
    if (!selectedService || !selectedSlot || !artist) return
    setSubmitting(true)
    setSubmitError('')

    let signatureDataUrl: string | null = null
    if (canvasRef.current) signatureDataUrl = canvasRef.current.toDataURL('image/png')

    const res = await fetch(`/api/book/${slug}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: selectedService.id,
        slotIso: selectedSlot.iso,
        clientName: clientInfo.name,
        clientEmail: clientInfo.email,
        clientPhone: clientInfo.phone,
        formResponses: formAnswers,
        signatureDataUrl,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setSubmitError(data.error || 'Something went wrong. Please try again.'); setSubmitting(false); return }
    setConfirmation({ startAt: data.startAt, serviceName: data.serviceName, clientName: data.clientName })
    setStep('confirm')
    setSubmitting(false)
  }

  // Determine if a deposit step is needed
  const hasDeposit = !!(selectedService?.deposit_amount && artist?.deposit_handle)

  // Validation per step
  const canProceed = useCallback((): boolean => {
    if (step === 'service') return !!selectedService
    if (step === 'date') return !!selectedDate
    if (step === 'time') return !!selectedSlot
    if (step === 'info') return !!(clientInfo.name.trim() && clientInfo.email.includes('@'))
    if (step === 'consent') {
      if (!consentForm) return true
      return consentForm.fields.filter(f => f.required && f.type !== 'signature').every(f => {
        const val = formAnswers[f.id]
        return val !== undefined && val !== '' && val !== null
      })
    }
    if (step === 'signature') return hasSigned
    if (step === 'deposit') return true // instructions only — client just reads and continues
    return true
  }, [step, selectedService, selectedDate, selectedSlot, clientInfo, consentForm, formAnswers, hasSigned])

  function nextStep() {
    if (step === 'signature') {
      // After signing: go to deposit step if applicable, otherwise finalize
      if (hasDeposit) { setStep('deposit'); return }
      finalizeBooking()
      return
    }
    if (step === 'deposit') {
      finalizeBooking()
      return
    }
    if (!consentForm && step === 'info') { setStep('signature'); return }
    const idx = STEPS.indexOf(step)
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }
  function prevStep() {
    if (step === 'deposit') { setStep('signature'); return }
    if (!consentForm && step === 'signature') { setStep('info'); return }
    const idx = STEPS.indexOf(step)
    if (idx > 0) setStep(STEPS[idx - 1])
  }

  // ─── Render states ─────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      <div>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Page not found</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>This booking link doesn&apos;t exist or has been removed.</p>
      </div>
    </div>
  )

  // Build step list dynamically: skip deposit step if no deposit needed
  const stepsToShow = STEPS.filter(s => {
    if (s === 'consent' && !consentForm) return false
    if (s === 'deposit' && !hasDeposit) return false
    return true
  })
  const currentStepIdx = stepsToShow.indexOf(step)

  return (
    <div style={{ minHeight: '100vh', padding: '1.5rem 1rem', maxWidth: '520px', margin: '0 auto' }}>

      {/* Artist header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        {artist!.profile_photo_url ? (
          <img src={artist!.profile_photo_url} alt={artist!.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.75rem', border: '2px solid var(--border)' }} />
        ) : (
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--muted)', border: '2px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
            {artist!.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.125rem' }}>{artist!.business_name || artist!.name}</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          {PROFESSION_LABELS[artist!.profession_type] || 'Artist'}{artist!.city ? ` · ${artist!.city}` : ''}
        </p>
        {artist!.bio && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginTop: '0.5rem', lineHeight: 1.5 }}>{artist!.bio}</p>}
      </div>

      {/* Step progress bar (hidden on confirm) */}
      {step !== 'confirm' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {stepsToShow.filter(s => s !== 'confirm').map((s, i) => (
              <div key={s} style={{ flex: 1, height: '3px', borderRadius: '999px', background: i <= currentStepIdx ? 'var(--accent)' : 'var(--border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'right' }}>
            Step {currentStepIdx + 1} of {stepsToShow.filter(s => s !== 'confirm').length} — {STEP_LABELS[step]}
          </p>
        </div>
      )}

      {/* ─── STEP: SERVICE ─────────────────────────────────────────────────── */}
      {step === 'service' && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '1rem' }}>Choose a service</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem' }}>
            {services.map(svc => (
              <button key={svc.id} onClick={() => setSelectedService(svc)} style={{
                textAlign: 'left', padding: '1rem 1.125rem', borderRadius: '0.75rem', border: '1px solid',
                borderColor: selectedService?.id === svc.id ? 'var(--accent)' : 'var(--border)',
                background: selectedService?.id === svc.id ? 'rgba(200,169,126,0.08)' : 'var(--card)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 600, marginBottom: '0.25rem', color: selectedService?.id === svc.id ? 'var(--accent)' : 'var(--foreground)' }}>{svc.name}</p>
                    {svc.description && <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{svc.description}</p>}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                      {formatDuration(svc.duration_minutes)}
                      {svc.deposit_amount && artist?.deposit_handle
                        ? <span style={{ color: 'var(--accent)', marginLeft: '0.5rem' }}>· ${(svc.deposit_amount / 100).toFixed(0)} deposit required</span>
                        : null}
                    </p>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', marginLeft: '1rem' }}>{formatPrice(svc.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP: DATE ────────────────────────────────────────────────────── */}
      {step === 'date' && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '1rem' }}>Choose a date</h2>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            {/* Month nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button onClick={() => setCalMonth(p => { const d = new Date(p.year, p.month - 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>‹</button>
              <span style={{ fontWeight: 600 }}>{MONTHS[calMonth.month]} {calMonth.year}</span>
              <button onClick={() => setCalMonth(p => { const d = new Date(p.year, p.month + 1); return { year: d.getFullYear(), month: d.getMonth() } })}
                style={{ background: 'none', border: 'none', color: 'var(--foreground)', cursor: 'pointer', fontSize: '1.25rem', padding: '0.25rem 0.5rem' }}>›</button>
            </div>
            {/* Day labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
              {['M','T','W','T','F','S','S'].map((d, i) => (
                <p key={i} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--muted-foreground)', padding: '0.25rem 0' }}>{d}</p>
              ))}
            </div>
            {/* Day cells */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {Array.from({ length: getFirstDayOfMonth(calMonth.year, calMonth.month) }, (_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(calMonth.year, calMonth.month) }, (_, i) => {
                const d = new Date(calMonth.year, calMonth.month, i + 1)
                const today = new Date(); today.setHours(0, 0, 0, 0)
                const maxDate = new Date(today); maxDate.setDate(today.getDate() + (artist?.advance_booking_days || 60))
                const isPast = d < today
                const isTooFar = d > maxDate
                const isSelected = selectedDate?.toDateString() === d.toDateString()
                const isDisabled = isPast || isTooFar
                return (
                  <button key={i} disabled={isDisabled} onClick={() => setSelectedDate(d)}
                    style={{
                      aspectRatio: '1', borderRadius: '50%', border: 'none', cursor: isDisabled ? 'not-allowed' : 'pointer',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      color: isSelected ? '#0a0a0a' : isDisabled ? 'var(--border)' : 'var(--foreground)',
                      fontWeight: isSelected ? 700 : 400, fontSize: '0.875rem',
                      transition: 'all 0.15s',
                    }}>
                    {i + 1}
                  </button>
                )
              })}
            </div>
          </div>
          {selectedDate && <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', textAlign: 'center' }}>Selected: <strong style={{ color: 'var(--foreground)' }}>{formatDate(selectedDate)}</strong></p>}
        </div>
      )}

      {/* ─── STEP: TIME ────────────────────────────────────────────────────── */}
      {step === 'time' && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>Choose a time</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>{selectedDate && formatDate(selectedDate)} · Times in {artist?.timezone?.replace('America/', '').replace('_', ' ')} time</p>
          {loadingSlots ? (
            <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem' }}>Checking availability…</p>
          ) : slots.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-foreground)' }}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>😔</p>
              <p style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}>No availability</p>
              <p style={{ fontSize: '0.875rem' }}>No open slots on this day. Go back and try another date.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.625rem', marginBottom: '1.5rem' }}>
              {slots.map(slot => (
                <button key={slot.iso} onClick={() => setSelectedSlot(slot)} style={{
                  padding: '0.75rem 0.5rem', borderRadius: '0.5rem', border: '1px solid',
                  borderColor: selectedSlot?.iso === slot.iso ? 'var(--accent)' : 'var(--border)',
                  background: selectedSlot?.iso === slot.iso ? 'rgba(200,169,126,0.12)' : 'var(--card)',
                  color: selectedSlot?.iso === slot.iso ? 'var(--accent)' : 'var(--foreground)',
                  fontWeight: selectedSlot?.iso === slot.iso ? 700 : 400,
                  fontFamily: 'monospace', fontSize: '0.9375rem', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── STEP: INFO ────────────────────────────────────────────────────── */}
      {step === 'info' && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '1rem' }}>Your information</h2>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="field">
              <label>Full name *</label>
              <input type="text" placeholder="Alex Rivera" value={clientInfo.name} onChange={e => setClientInfo(p => ({ ...p, name: e.target.value }))} autoFocus />
            </div>
            <div className="field">
              <label>Email address *</label>
              <input type="email" placeholder="alex@email.com" value={clientInfo.email} onChange={e => setClientInfo(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Phone number</label>
              <input type="tel" placeholder="(555) 000-0000" value={clientInfo.phone} onChange={e => setClientInfo(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP: CONSENT FORM ────────────────────────────────────────────── */}
      {step === 'consent' && consentForm && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>{consentForm.name}</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            Please answer all required questions honestly. This information is managed by {artist!.business_name || artist!.name} and is not shared with third parties.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem', marginBottom: '1.5rem' }}>
            {consentForm.fields.filter(f => f.type !== 'signature').map(field => (
              <div key={field.id} className="card" style={{ padding: '1rem 1.125rem' }}>
                <label style={{ marginBottom: '0.625rem', color: 'var(--foreground)', fontWeight: 500 }}>
                  {field.label}{field.required && <span style={{ color: 'var(--accent)', marginLeft: '0.25rem' }}>*</span>}
                </label>
                {field.type === 'yes_no' && (
                  <div style={{ display: 'flex', gap: '0.625rem' }}>
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setFormAnswers(p => ({ ...p, [field.id]: opt }))}
                        style={{ flex: 1, padding: '0.625rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer',
                          borderColor: formAnswers[field.id] === opt ? 'var(--accent)' : 'var(--border)',
                          background: formAnswers[field.id] === opt ? 'rgba(200,169,126,0.12)' : 'var(--muted)',
                          color: formAnswers[field.id] === opt ? 'var(--accent)' : 'var(--muted-foreground)',
                          fontWeight: formAnswers[field.id] === opt ? 600 : 400, fontSize: '0.9375rem',
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {field.type === 'text' && (
                  <input type="text" value={(formAnswers[field.id] as string) || ''} onChange={e => setFormAnswers(p => ({ ...p, [field.id]: e.target.value }))} />
                )}
                {field.type === 'textarea' && (
                  <textarea rows={3} value={(formAnswers[field.id] as string) || ''} onChange={e => setFormAnswers(p => ({ ...p, [field.id]: e.target.value }))} style={{ resize: 'vertical' }} />
                )}
                {field.type === 'checkbox' && (
                  <label style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', cursor: 'pointer', color: 'var(--muted-foreground)', fontWeight: 400 }}>
                    <input type="checkbox" checked={!!formAnswers[field.id]} onChange={e => setFormAnswers(p => ({ ...p, [field.id]: e.target.checked }))}
                      style={{ width: '18px', height: '18px', marginTop: '2px', flexShrink: 0, accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{field.label}</span>
                  </label>
                )}
                {field.type === 'multiple_choice' && field.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {field.options.map(opt => (
                      <button key={opt} type="button" onClick={() => setFormAnswers(p => ({ ...p, [field.id]: opt }))}
                        style={{ textAlign: 'left', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid', cursor: 'pointer',
                          borderColor: formAnswers[field.id] === opt ? 'var(--accent)' : 'var(--border)',
                          background: formAnswers[field.id] === opt ? 'rgba(200,169,126,0.12)' : 'var(--muted)',
                          color: formAnswers[field.id] === opt ? 'var(--accent)' : 'var(--muted-foreground)',
                          fontSize: '0.875rem',
                        }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {field.type === 'date' && (
                  <input type="date" value={(formAnswers[field.id] as string) || ''} onChange={e => setFormAnswers(p => ({ ...p, [field.id]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP: SIGNATURE ───────────────────────────────────────────────── */}
      {step === 'signature' && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>Sign to confirm</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
            By signing, you confirm that all information provided is accurate and you agree to proceed. This form is a tool provided by {artist!.business_name || artist!.name}. BookRight is not a medical or legal service provider.
          </p>
          <div className="card" style={{ marginBottom: '1rem' }}>
            <label style={{ marginBottom: '0.625rem' }}>Your signature</label>
            <div style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--muted)', touchAction: 'none' }}>
              <canvas ref={canvasRef} width={460} height={160} style={{ display: 'block', width: '100%', height: '160px', cursor: 'crosshair' }}
                onMouseDown={startSign} onMouseMove={drawSign} onMouseUp={endSign} onMouseLeave={endSign}
                onTouchStart={startSign} onTouchMove={drawSign} onTouchEnd={endSign} />
              {!hasSigned && (
                <p style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: 'var(--border)', fontSize: '0.875rem', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
                  Draw your signature here
                </p>
              )}
            </div>
            <button onClick={clearSignature} style={{ marginTop: '0.625rem', background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.8125rem', padding: 0 }}>
              Clear and re-sign
            </button>
          </div>
          {submitError && <p className="error-text" style={{ marginBottom: '1rem' }}>{submitError}</p>}
        </div>
      )}

      {/* ─── STEP: DEPOSIT ─────────────────────────────────────────────────── */}
      {step === 'deposit' && selectedService && artist && (
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.375rem' }}>Send your deposit</h2>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            A deposit is required to hold your spot. Please send it directly to {artist.business_name || artist.name} using the details below — your appointment will be confirmed once received.
          </p>

          {/* Deposit instructions card */}
          <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(200,169,126,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Deposit amount</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>
                  ${selectedService.deposit_amount ? (selectedService.deposit_amount / 100).toFixed(0) : '0'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Send via</p>
                <p style={{ fontSize: '1.125rem', fontWeight: 700 }}>{METHOD_LABELS[artist.deposit_method || ''] || artist.deposit_method}</p>
              </div>
            </div>

            <div style={{ background: 'var(--muted)', borderRadius: '0.625rem', padding: '1rem 1.125rem', marginBottom: artist.deposit_instructions ? '1rem' : 0 }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginBottom: '0.375rem' }}>Send to</p>
              <p style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--foreground)', letterSpacing: '0.01em' }}>{artist.deposit_handle}</p>
            </div>

            {artist.deposit_instructions && (
              <div style={{ padding: '0.75rem 0', borderTop: '1px solid var(--border)', marginTop: '0.25rem' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
                  📝 {artist.deposit_instructions}
                </p>
              </div>
            )}
          </div>

          {/* Booking summary reminder */}
          <div style={{ padding: '0.875rem 1rem', borderRadius: '0.625rem', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', marginBottom: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.375rem' }}>Your appointment</p>
            <p style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{selectedService.name}</p>
            {selectedDate && <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginTop: '0.125rem' }}>{formatDate(selectedDate)}{selectedSlot ? ` at ${selectedSlot.time}` : ''}</p>}
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5, textAlign: 'center' }}>
            Hit &quot;I&apos;ve sent my deposit&quot; after sending — {artist.business_name || artist.name} will confirm your booking.
          </p>
        </div>
      )}

      {/* ─── STEP: CONFIRM ─────────────────────────────────────────────────── */}
      {step === 'confirm' && confirmation && (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.5rem' }}>You&apos;re booked!</h2>
          <p style={{ color: 'var(--muted-foreground)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Your appointment has been requested. {artist!.business_name || artist!.name} will confirm shortly.
          </p>
          <div style={{ background: 'var(--muted)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--accent)' }}>Appointment details</p>
            <p style={{ fontSize: '0.9375rem', marginBottom: '0.375rem' }}><strong>Service:</strong> {confirmation.serviceName}</p>
            <p style={{ fontSize: '0.9375rem', marginBottom: '0.375rem' }}><strong>Date:</strong> {new Date(confirmation.startAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: artist?.timezone })}</p>
            <p style={{ fontSize: '0.9375rem', marginBottom: '0.375rem' }}><strong>Time:</strong> {new Date(confirmation.startAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: artist?.timezone })}</p>
            <p style={{ fontSize: '0.9375rem' }}><strong>With:</strong> {artist!.business_name || artist!.name}</p>
          </div>

          {/* Show deposit reminder on confirmation if applicable */}
          {hasDeposit && selectedService?.deposit_amount && artist?.deposit_handle && (
            <div style={{ background: 'rgba(200,169,126,0.08)', border: '1px solid rgba(200,169,126,0.25)', borderRadius: '0.75rem', padding: '1rem 1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--accent)', fontSize: '0.875rem' }}>💸 Deposit reminder</p>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                Send <strong>${(selectedService.deposit_amount / 100).toFixed(0)}</strong> to <strong>{artist.deposit_handle}</strong> via <strong>{METHOD_LABELS[artist.deposit_method || ''] || artist.deposit_method}</strong> to hold your spot.
              </p>
              {artist.deposit_instructions && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '0.375rem' }}>{artist.deposit_instructions}</p>
              )}
            </div>
          )}

          <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
            A confirmation will be sent to <strong style={{ color: 'var(--foreground)' }}>{clientInfo.email}</strong>. Check your spam if you don&apos;t see it.
          </p>
        </div>
      )}

      {/* ─── Navigation buttons ─────────────────────────────────────────────── */}
      {step !== 'confirm' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button className="btn-primary" onClick={nextStep} disabled={!canProceed() || submitting}>
            {submitting
              ? 'Booking…'
              : step === 'deposit'
              ? "I've sent my deposit →"
              : step === 'signature'
              ? hasDeposit ? 'Continue to deposit →' : 'Confirm booking'
              : 'Continue →'}
          </button>
          {step !== 'service' && (
            <button className="btn-secondary" onClick={prevStep}>← Back</button>
          )}
        </div>
      )}

      {/* Footer note */}
      {step !== 'confirm' && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--border)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Powered by BookRight · Booking info is collected by {artist!.business_name || artist!.name}
        </p>
      )}
    </div>
  )
}
