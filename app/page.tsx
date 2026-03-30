import Link from 'next/link'

export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <nav style={{ padding: '1.25rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent)' }}>BookRight</span>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link href="/auth/login" style={{ color: 'var(--muted-foreground)', textDecoration: 'none', fontSize: '0.9375rem' }}>Log in</Link>
          <Link href="/auth/signup" style={{ background: 'var(--accent)', color: '#0a0a0a', fontWeight: 600, padding: '0.5rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>Get started free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px' }}>
          <div style={{ display: 'inline-block', background: 'var(--muted)', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600, padding: '0.375rem 0.875rem', borderRadius: '999px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            For tattoo artists · hairstylists · nail techs · and more
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.25rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
            Booking and consent forms,<br />
            <span style={{ color: 'var(--accent)' }}>built for your chair.</span>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--muted-foreground)', lineHeight: 1.6, marginBottom: '2.5rem', maxWidth: '480px', margin: '0 auto 2.5rem' }}>
            Share one link. Clients book, fill out your intake form, and sign — all before they walk in. No paper. No chasing.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth/signup" style={{ background: 'var(--accent)', color: '#0a0a0a', fontWeight: 700, padding: '0.875rem 2rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '1rem' }}>
              Start free — no card required
            </Link>
            <Link href="/auth/login" style={{ background: 'transparent', color: 'var(--foreground)', fontWeight: 500, padding: '0.875rem 2rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '1rem', border: '1px solid var(--border)' }}>
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 2rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {[
            { icon: '🔗', title: 'One shareable link', desc: "Your booking page lives at bookright.app/your-name. Add it to your Instagram bio and you're done." },
            { icon: '📋', title: 'Consent forms built in', desc: 'Pre-built templates for tattoo, hair, nails, and lash. Clients sign digitally before they arrive.' },
            { icon: '📅', title: 'Set your own hours', desc: 'Control your availability, buffer time, and block off days for conventions or vacations.' },
            { icon: '📱', title: 'Works on any device', desc: 'Your clients book from their phones. You manage everything from yours.' },
          ].map(f => (
            <div key={f.title} className="card" style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '4rem 2rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Simple pricing</h2>
        <p style={{ color: 'var(--muted-foreground)', marginBottom: '3rem' }}>Start free. Upgrade when you get busy.</p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '700px', margin: '0 auto' }}>
          {/* Free */}
          <div className="card" style={{ flex: 1, minWidth: '240px', textAlign: 'left' }}>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Free</p>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>$0<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span></p>
            {['Up to 10 bookings/month', '1 consent form template', 'Basic dashboard', 'Shareable booking link'].map(f => (
              <p key={f} style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>✓ {f}</p>
            ))}
            <Link href="/auth/signup" style={{ display: 'block', marginTop: '1.5rem', textDecoration: 'none', textAlign: 'center', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', color: 'var(--foreground)', fontWeight: 500, fontSize: '0.9375rem' }}>Get started</Link>
          </div>
          {/* Pro */}
          <div className="card" style={{ flex: 1, minWidth: '240px', textAlign: 'left', border: '1px solid var(--accent)' }}>
            <p style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Pro</p>
            <p style={{ fontSize: '2.25rem', fontWeight: 800, marginBottom: '1.5rem' }}>$29<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted-foreground)' }}>/mo</span></p>
            {['Unlimited bookings', 'All 5 consent form templates', 'Custom form builder', 'Full client history', 'SMS reminders', 'Google Calendar sync'].map(f => (
              <p key={f} style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>✓ {f}</p>
            ))}
            <Link href="/auth/signup" style={{ display: 'block', marginTop: '1.5rem', textDecoration: 'none', textAlign: 'center', padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--accent)', color: '#0a0a0a', fontWeight: 600, fontSize: '0.9375rem' }}>Start free trial</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center', color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>
        <p>© 2026 BookRight &nbsp;·&nbsp; <Link href="/privacy" style={{ color: 'var(--muted-foreground)' }}>Privacy</Link> &nbsp;·&nbsp; <Link href="/terms" style={{ color: 'var(--muted-foreground)' }}>Terms</Link></p>
        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', maxWidth: '560px', margin: '0.625rem auto 0', lineHeight: 1.5 }}>
          BookRight is not a HIPAA-covered entity. Consent form content is managed solely by the artist. Artists are responsible for their own legal compliance.
        </p>
      </footer>
    </main>
  )
}
