import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/dashboard/calendar', label: 'Calendar', icon: '📅' },
  { href: '/dashboard/clients', label: 'Clients', icon: '👥' },
  { href: '/dashboard/services', label: 'Services', icon: '✂️' },
  { href: '/dashboard/availability', label: 'Availability', icon: '🕐' },
  { href: '/dashboard/blocked-times', label: 'Blocked Times', icon: '🚫' },
  { href: '/dashboard/forms', label: 'Forms', icon: '📋' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: artist } = user
    ? await supabase.from('artists').select('plan').eq('id', user.id).single()
    : { data: null }

  const isPro = artist?.plan === 'pro'

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', borderRight: '1px solid var(--border)', padding: '1.5rem 0', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 1.25rem', marginBottom: '2rem' }}>
          <Link href="/dashboard" style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--accent)', textDecoration: 'none' }}>BookRight</Link>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 1.25rem', color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '0.9375rem', transition: 'color 0.15s' }}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div style={{ padding: '1.25rem' }}>
          {isPro ? (
            <Link href="/dashboard/upgrade"
              style={{ display: 'block', textAlign: 'center', padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(200,169,126,0.15)', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(200,169,126,0.3)' }}>
              ⚡ Pro plan
            </Link>
          ) : (
            <Link href="/dashboard/upgrade"
              style={{ display: 'block', textAlign: 'center', padding: '0.625rem', borderRadius: '0.5rem', background: 'rgba(200,169,126,0.12)', color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(200,169,126,0.25)' }}>
              ⚡ Upgrade to Pro
            </Link>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
