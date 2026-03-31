import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' })
const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'BookRight <onboarding@resend.dev>'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {

    // ── Pro subscription activated ────────────────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.metadata?.artist_id) {
        await supabase
          .from('artists')
          .update({
            plan: 'pro',
            plan_started_at: new Date().toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
          })
          .eq('id', session.metadata.artist_id)
      }
      break
    }

    // ── Subscription renewed or updated ──────────────────────────────────────
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      // Re-activate pro if a previously past-due sub comes back active
      if (sub.status === 'active' && sub.metadata?.artist_id) {
        await supabase
          .from('artists')
          .update({ plan: 'pro' })
          .eq('id', sub.metadata.artist_id)
      }
      break
    }

    // ── Subscription cancelled / expired ─────────────────────────────────────
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await supabase
        .from('artists')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('stripe_subscription_id', sub.id)
      break
    }

    // ── Payment failed — email the artist ────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (customerId) {
        const { data: artist } = await supabase
          .from('artists')
          .select('email, name')
          .eq('stripe_customer_id', customerId)
          .single()

        if (artist?.email) {
          try {
            await resend.emails.send({
              from: FROM,
              to: artist.email,
              subject: 'Action required — BookRight Pro payment failed',
              html: `
                <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0a0a; color: #f5f5f5; border-radius: 12px; overflow: hidden;">
                  <div style="background: #141414; padding: 20px 28px; border-bottom: 1px solid #2a2a2a;">
                    <p style="margin:0; font-size:13px; color:#888; text-transform:uppercase; letter-spacing:.05em;">BookRight</p>
                    <h1 style="margin:8px 0 0; font-size:20px; font-weight:700; color:#ef4444;">Payment failed</h1>
                  </div>
                  <div style="padding: 24px 28px;">
                    <p style="color:#ccc; line-height:1.6; margin:0 0 16px;">
                      Hey ${artist.name?.split(' ')[0] || 'there'}, we couldn't process your BookRight Pro payment.
                    </p>
                    <p style="color:#ccc; line-height:1.6; margin:0 0 20px;">
                      Your Pro features will remain active briefly while we retry. Please update your payment method to avoid losing access.
                    </p>
                    <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/upgrade"
                      style="display:inline-block; background:#c8a97e; color:#0a0a0a; font-weight:700; padding:12px 24px; border-radius:8px; text-decoration:none; font-size:14px;">
                      Update payment method →
                    </a>
                    <p style="color:#555; font-size:12px; margin-top:20px;">
                      Questions? Reply to this email or contact support@bookright.app
                    </p>
                  </div>
                </div>
              `,
            })
          } catch (e) {
            console.error('Failed to send payment failed email:', e)
          }
        }
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
