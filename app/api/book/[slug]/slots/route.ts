import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Returns available time slots for a given artist, date, and service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const dateStr = searchParams.get('date')     // e.g. "2026-03-28"
  const serviceId = searchParams.get('serviceId')

  if (!dateStr || !serviceId) {
    return NextResponse.json({ error: 'Missing date or serviceId' }, { status: 400 })
  }

  const supabase = await createClient()

  // Fetch artist by slug
  const { data: artist } = await supabase
    .from('artists')
    .select('id, timezone, buffer_minutes, min_notice_hours, advance_booking_days')
    .eq('booking_slug', slug)
    .single()

  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  // Fetch service duration
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('artist_id', artist.id)
    .eq('is_active', true)
    .single()

  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

  // Parse the requested date
  const [year, month, day] = dateStr.split('-').map(Number)
  const requestedDate = new Date(year, month - 1, day)
  const dayOfWeek = requestedDate.getDay() // 0=Sun

  // Get availability rule for this day
  const { data: rule } = await supabase
    .from('availability_rules')
    .select('start_time, end_time, is_available')
    .eq('artist_id', artist.id)
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!rule || !rule.is_available) {
    return NextResponse.json({ slots: [] })
  }

  // Check for blocked times covering this day
  const dayStart = new Date(year, month - 1, day, 0, 0, 0).toISOString()
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59).toISOString()

  const { data: blockedTimes } = await supabase
    .from('blocked_times')
    .select('start_at, end_at')
    .eq('artist_id', artist.id)
    .lt('start_at', dayEnd)
    .gt('end_at', dayStart)

  // Get existing appointments for this day (non-cancelled)
  const { data: existingAppts } = await supabase
    .from('appointments')
    .select('start_at, end_at')
    .eq('artist_id', artist.id)
    .gte('start_at', dayStart)
    .lte('start_at', dayEnd)
    .neq('status', 'cancelled')

  const tz = artist.timezone || 'America/New_York'
  const bufferMin = artist.buffer_minutes || 0
  const minNoticeMs = (artist.min_notice_hours || 24) * 60 * 60 * 1000
  const now = Date.now()

  // Parse start/end from availability rule (HH:MM)
  const [startH, startM] = rule.start_time.split(':').map(Number)
  const [endH, endM] = rule.end_time.split(':').map(Number)

  // Build slot list in 30-min increments
  const slots: string[] = []
  const serviceDuration = service.duration_minutes
  const slotStep = 30 // increment in minutes

  let slotMinutes = startH * 60 + startM
  const dayEndMinutes = endH * 60 + endM

  while (slotMinutes + serviceDuration <= dayEndMinutes) {
    const slotStart = new Date(year, month - 1, day,
      Math.floor(slotMinutes / 60),
      slotMinutes % 60, 0, 0
    )
    const slotEnd = new Date(slotStart.getTime() + (serviceDuration + bufferMin) * 60 * 1000)

    // 1. Min notice check
    if (slotStart.getTime() - now < minNoticeMs) {
      slotMinutes += slotStep
      continue
    }

    // 2. Check against existing appointments (with buffer)
    const conflictsAppt = existingAppts?.some(appt => {
      const apptStart = new Date(appt.start_at).getTime()
      const apptEnd = new Date(appt.end_at).getTime() + bufferMin * 60 * 1000
      return slotStart.getTime() < apptEnd && slotEnd.getTime() > apptStart
    })
    if (conflictsAppt) { slotMinutes += slotStep; continue }

    // 3. Check against blocked times
    const conflictsBlocked = blockedTimes?.some(b => {
      const bStart = new Date(b.start_at).getTime()
      const bEnd = new Date(b.end_at).getTime()
      return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart
    })
    if (conflictsBlocked) { slotMinutes += slotStep; continue }

    // Format slot time in 24-hour format using artist's timezone
    const timeLabel = slotStart.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz,
    })

    slots.push(JSON.stringify({ time: timeLabel, iso: slotStart.toISOString() }))
    slotMinutes += slotStep
  }

  return NextResponse.json({ slots: slots.map(s => JSON.parse(s)) })
}
