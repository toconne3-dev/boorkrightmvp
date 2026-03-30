import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UpgradeButton from './_components/UpgradeButton'
import ManageButton from './_components/ManageButton'

const FREE_FEATURES = [
  'Up to 10 bookings / month',
  '1 consent form template',
  'Shareable booking link',
  'Client intake forms',
  'Manual deposit instructions',
  'Basic dashboard',
]

const PRO_FEATURES = [
  'Unlimited bookings',
  'All 5 consent form templates',
  'Custom form builder',
  'Full client history',
  'Priority support',
  'Early access to new features',
]

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>
}) {
  const { success, cancelled } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: artist } = await supabase
    .from('artists')
    .select('plan, name, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const isPro = artist?.plan === 'pro'
  const stripeEnabled = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRO_PRICE_ID

  // ─── Already on Pro ──────────────────────────────────────────────────────────
  if (isPro) {
    return (
      <div style={{ maxWidth: '520px' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>You&apos;re on Pro ⚡</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Thanks for supporting BookRight{artist.name ? `, ${artist.name.split(' ')[0]}` : ''}.
          </p>
        </div>

        {success && (
          <div style={{ padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '0.75rem', marginBottom: '1.25rem', color: '#22c55e', fontSize: '0.9375rem' }}>
            🎉 Welcome to Pro! Your account has been upgraded.
          </div>
        )}

        <div className="card" style={{ border: '1px solid var(--accent)' }}>
          <p style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '1rem', fontSize: '0.9375rem' }}>Your Pro features</p>
          {PRO_FEATURES.map(f => (
            <p key={f} style={{ fontSize: '0.9375rem', color: 'var(--muted-foreground)', marginBottom: '0.625rem' }}>
              <span style={{ color: '#22c55e', marginRight: '0.5rem' }}>✓</span>{f}
            </p>
          ))}
          {artist.stripe_customer_id && <ManageButton />}
        </div>
      </div>
    )
  }

  // ─── Free plan — show upgrade prompt ─────────────────────────────────────────
  return (
    <div style={{ maxWidth: '660px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Upgrade to Pro</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          Unlock unlimited bookings, all consent form templates, and more.
        </p>
      </div>

      {cancelled && (
        <div style={{ padding: '0.875rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '0.625rem', marginBottom: '1.25rem', color: '#f59e0b', fontSize: '0.875rem' }}>
          Checkout was cancelled. You&apos;re still on the Free plan.
        </div>
      )}

      {/* Plan comparison */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Free card */}
        <div className="card">
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Free</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            $0<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span>
          </p>
          {FREE_FEATURES.map(f => (
            <p key={f} style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>✓ {f}</p>
          ))}
          <div style={{ marginTop: '1.25rem', padding: '0.625rem', borderRadius: '0.5rem', background: 'var(--muted)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
            Current plan
          </div>
        </div>

        {/* Pro card */}
        <div className="card" style={{ border: '1px solid var(--accent)', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '-1px', right: '1rem', background: 'var(--accent)', color: '#0a0a0a', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '0 0 0.375rem 0.375rem', letterSpacing: '0.05em' }}>
            RECOMMENDED
          </div>
          <p style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pro</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.25rem' }}>
            $29<span style={{ fontSize: '0.875rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span>
          </p>
          {PRO_FEATURES.map(f => (
            <p key={f} style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--accent)', marginRight: '0.5rem' }}>✓</span>{f}
            </p>
          ))}

          {stripeEnabled ? (
            <UpgradeButton />
          ) : (
            <div>
              <button disabled style={{ width: '100%', marginTop: '1.25rem', background: 'var(--muted)', color: 'var(--muted-foreground)', fontWeight: 600, padding: '0.875rem', borderRadius: '0.5rem', border: '1px solid var(--border)', cursor: 'not-allowed', fontSize: '0.9375rem' }}>
                Coming soon
              </button>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', textAlign: 'center', marginTop: '0.625rem' }}>
                Add <code style={{ background: 'var(--muted)', padding: '0 4px', borderRadius: 3 }}>STRIPE_PRO_PRICE_ID</code> to enable
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FAQ / trust block */}
      <div className="card" style={{ background: 'var(--muted)', border: 'none' }}>
        <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.9375rem' }}>Common questions</p>
        {[
          { q: 'Can I cancel anytime?', a: 'Yes — cancel from the billing portal and you keep Pro access until the end of your billing period.' },
          { q: 'What happens to my bookings if I downgrade?', a: 'All existing appointments and client data stay. New bookings revert to the 10/month Free limit.' },
          { q: 'Is payment secure?', a: 'Checkout is handled entirely by Stripe. BookRight never sees your card details.' },
        ].map(({ q, a }) => (
          <div key={q} style={{ marginBottom: '0.875rem', paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 500, marginBottom: '0.25rem', fontSize: '0.875rem' }}>{q}</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>{a}</p>
          </div>
        ))}
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: 0 }}>
          Questions? Email <strong style={{ color: 'var(--foreground)' }}>support@bookright.app</strong>
        </p>
      </div>
    </div>
  )
}
