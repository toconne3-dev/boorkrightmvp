export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const steps = ['Profile', 'Services', 'Availability', 'Consent Form', 'Booking Link']
  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--accent)' }}>BookRight</span>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Set up your booking page</p>
        </div>
        {/* Step indicators */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <span key={s} style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '0.25rem 0.75rem', borderRadius: '999px', border: '1px solid var(--border)' }}>
              {i + 1}. {s}
            </span>
          ))}
        </div>
        {children}
      </div>
    </div>
  )
}
