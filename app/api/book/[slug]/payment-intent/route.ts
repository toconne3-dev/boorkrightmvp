import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-01-27.acacia' })

// Creates a Stripe PaymentIntent for a deposit on a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body = await request.json()
  const { serviceId, clientEmail, clientName } = body

  if (!serviceId || !clientEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured yet.' }, { status: 503 })
  }

  const supabase = await createClient()

  // Verify artist + service
  const { data: artist } = await supabase
    .from('artists')
    .select('id, name, business_name')
    .eq('booking_slug', slug)
    .single()
  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const { data: service } = await supabase
    .from('services')
    .select('id, name, deposit_amount')
    .eq('id', serviceId)
    .eq('artist_id', artist.id)
    .single()
  if (!service) return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  if (!service.deposit_amount || service.deposit_amount <= 0) {
    return NextResponse.json({ error: 'This service does not require a deposit' }, { status: 400 })
  }

  // Create or find Stripe customer
  const customers = await stripe.customers.list({ email: clientEmail, limit: 1 })
  let customerId: string
  if (customers.data.length > 0) {
    customerId = customers.data[0].id
  } else {
    const customer = await stripe.customers.create({ email: clientEmail, name: clientName })
    customerId = customer.id
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: service.deposit_amount,
    currency: 'usd',
    customer: customerId,
    description: `Deposit for ${service.name} with ${artist.business_name || artist.name}`,
    metadata: {
      artist_id: artist.id,
      service_id: serviceId,
      artist_slug: slug,
      client_email: clientEmail,
    },
    automatic_payment_methods: { enabled: true },
  })

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    amount: service.deposit_amount,
    paymentIntentId: paymentIntent.id,
  })
}
