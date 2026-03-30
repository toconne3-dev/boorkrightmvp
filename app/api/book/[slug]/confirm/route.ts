import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendArtistNewBooking } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { serviceId, slotIso, clientName, clientEmail, clientPhone, formResponses, signatureDataUrl } = body

  if (!serviceId || !slotIso || !clientName || !clientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch artist (including email for notifications)
  const { data: artist } = await supabase
    .from('artists')
    .select('id, buffer_minutes, plan, name, business_name, timezone, booking_slug, email')
    .eq('booking_slug', slug)
    .single()
  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  // Check free plan limit (10 bookings/month)
  if (artist.plan === 'free') {
    const monthStart = new Date()
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
      .gte('created_at', monthStart.toISOString())
      .neq('status', 'cancelled')

    if ((count || 0) >= 10) {
      return NextResponse.json({ error: 'This artist has reached their monthly booking limit. Please contact them directly.' }, { status: 429 })
    }
  }

  // Fetch service
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes, name, deposit_amount')
    .eq('id', serviceId)
    .eq('artist_id', artist.id)
    .single()
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  const startAt = new Date(slotIso)
  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60 * 1000)

  // Double-check slot is still available
  const { data: conflict } = await supabase
    .from('appointments')
    .select('id')
    .eq('artist_id', artist.id)
    .neq('status', 'cancelled')
    .lt('start_at', endAt.toISOString())
    .gt('end_at', startAt.toISOString())
    .maybeSingle()

  if (conflict) {
    return NextResponse.json({ error: 'This time slot was just booked. Please choose another.' }, { status: 409 })
  }

  // Upsert client record (find by email + artist, or create)
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('artist_id', artist.id)
    .eq('email', clientEmail.toLowerCase())
    .maybeSingle()

  let clientId: string
  if (existingClient) {
    clientId = existingClient.id
    // Update name/phone in case they changed
    await supabase.from('clients').update({ name: clientName, phone: clientPhone || null }).eq('id', clientId)
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ artist_id: artist.id, name: clientName, email: clientEmail.toLowerCase(), phone: clientPhone || null })
      .select('id')
      .single()
    if (clientError || !newClient) return NextResponse.json({ error: 'Could not create client record' }, { status: 500 })
    clientId = newClient.id
  }

  // Create appointment
  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      artist_id: artist.id,
      client_id: clientId,
      service_id: serviceId,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'pending',
      confirmation_sent: false,
      deposit_required: service?.deposit_amount || null,
      deposit_paid: false,
    })
    .select('id')
    .single()

  if (apptError || !appointment) return NextResponse.json({ error: 'Could not create appointment' }, { status: 500 })

  // Save consent form response if provided
  if (formResponses || signatureDataUrl) {
    // Get the artist's active consent form
    const { data: consentForm } = await supabase
      .from('consent_forms')
      .select('id')
      .eq('artist_id', artist.id)
      .eq('is_template', false)
      .order('created_at')
      .limit(1)
      .single()

    if (consentForm) {
      // Upload signature image if present
      let signatureUrl: string | null = null
      if (signatureDataUrl) {
        const base64 = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
        const buffer = Buffer.from(base64, 'base64')
        const fileName = `signatures/${appointment.id}.png`
        const { error: uploadError } = await supabase.storage
          .from('bookright')
          .upload(fileName, buffer, { contentType: 'image/png', upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('bookright').getPublicUrl(fileName)
          signatureUrl = urlData.publicUrl
        }
      }

      const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null

      await supabase.from('consent_form_responses').insert({
        appointment_id: appointment.id,
        consent_form_id: consentForm.id,
        responses: formResponses || {},
        signature_url: signatureUrl,
        signed_at: new Date().toISOString(),
        client_ip: clientIp,
      })
    }
  }

  // Send notification email to artist (non-fatal)
  if (artist.email) {
    try {
      await sendArtistNewBooking({
        artistEmail: artist.email,
        artistName: artist.business_name || artist.name,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        serviceName: service.name,
        startAt: startAt.toISOString(),
        timezone: artist.timezone || 'America/New_York',
        depositRequired: service.deposit_amount || null,
        appointmentId: appointment.id,
      })
    } catch (e) {
      console.error('Failed to send artist notification email:', e)
    }
  }

  return NextResponse.json({
    success: true,
    appointmentId: appointment.id,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    serviceName: service.name,
    clientName,
  })
}
