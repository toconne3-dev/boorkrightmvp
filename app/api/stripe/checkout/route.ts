import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }
    if (!process.env.STRIPE_PRO_PRICE_ID) {
      return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-03-25.dahlia' })

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: artist } = await supabase
      .from('artists')
      .select('plan, stripe_customer_id, email, name')
      .eq('id', user.id)
      .single()

    if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    if (artist.plan === 'pro') return NextResponse.json({ error: 'Already on Pro' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      ...(artist.stripe_customer_id
        ? { customer: artist.stripe_customer_id }
        : { customer_email: artist.email }),
      metadata: { artist_id: user.id },
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
      subscription_data: { metadata: { artist_id: user.id } },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      success_url: `${appUrl}/dashboard/upgrade?success=1`,
      cancel_url: `${appUrl}/dashboard/upgrade?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('Stripe checkout error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
