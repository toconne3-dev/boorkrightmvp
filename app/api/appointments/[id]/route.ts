import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendClientConfirmation } from '@/lib/email'

const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'no_show', 'cancelled']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const { status, deposit_paid } = body

  if (!id) return NextResponse.json({ error: 'Missing appointment id' }, { status: 400 })
  if (status && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createClient()

  // Get logged-in artist
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch appointment (verify ownership)
  const { data: appt } = await supabase
    .from('appointments')
    .select(`
      id, status, deposit_paid, start_at, end_at,
      clients(name, email),
      services(name, duration_minutes),
      artists(name, business_name, timezone, booking_slug)
    `)
    .eq('id', id)
    .eq('artist_id', user.id)
    .single()

  if (!appt) return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })

  // Cast joined relations (Supabase infers these as arrays; we know they're single objects)
  const client = (Array.isArray(appt.clients) ? appt.clients[0] : appt.clients) as { name: string; email: string } | null
  const service = (Array.isArray(appt.services) ? appt.services[0] : appt.services) as { name: string; duration_minutes: number } | null
  const artist = (Array.isArray(appt.artists) ? appt.artists[0] : appt.artists) as { name: string; business_name: string | null; timezone: string; booking_slug: string } | null

  // Build update payload
  const updates: Record<string, string | boolean> = {}
  if (status) updates.status = status
  if (deposit_paid === true) updates.deposit_paid = true

  const { error: updateError } = await supabase
    .from('appointments')
    .update(updates)
    .eq('id', id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Send client confirmation email when artist confirms
  if (status === 'confirmed' && client?.email) {
    try {
      await sendClientConfirmation({
        clientEmail: client.email,
        clientName: client.name,
        artistName: artist?.business_name || artist?.name || 'Your artist',
        serviceName: service?.name || 'Your appointment',
        startAt: appt.start_at,
        timezone: artist?.timezone || 'America/New_York',
        bookingSlug: artist?.booking_slug || '',
      })
    } catch (e) {
      // Non-fatal: log but don't fail the request
      console.error('Failed to send confirmation email:', e)
    }
  }

  return NextResponse.json({ success: true, status: status || appt.status })
}
