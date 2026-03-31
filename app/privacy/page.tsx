import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif', color: '#f5f5f5' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#c8a97e', textDecoration: 'none', fontSize: '0.875rem' }}>← BookRight</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Privacy Policy</h1>
      <p style={{ color: '#888', marginBottom: '2.5rem', fontSize: '0.875rem' }}>Last updated: June 2025</p>

      <div style={{ lineHeight: 1.7, color: '#ccc', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>1. Information We Collect</h2>
          <p>When you create an account, we collect your name, email address, business information, and payment details (processed securely by Stripe — we never see or store raw card numbers). When clients book through your page, their name, email, phone, and form responses are stored and associated with your account.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>2. How We Use Your Information</h2>
          <p>We use your information to provide and improve the BookRight service, send transactional emails (booking notifications, confirmations), process subscription payments, and communicate with you about your account. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>3. Client Data</h2>
          <p>Client data collected through your booking page (names, contact info, consent form responses, signatures) is stored on our infrastructure and is accessible to you through your dashboard. You are the data controller for your clients&apos; information. We process it on your behalf as a data processor.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>4. Data Storage and Security</h2>
          <p>Your data is stored securely using Supabase, hosted on AWS infrastructure. We use HTTPS for all data transmission, row-level security policies to isolate your data from other users, and access controls to restrict who can view your information. Signature images are stored in private object storage.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>5. Third-Party Services</h2>
          <p>We use the following third-party services: <strong style={{ color: '#f5f5f5' }}>Supabase</strong> for database and authentication, <strong style={{ color: '#f5f5f5' }}>Stripe</strong> for subscription billing, and <strong style={{ color: '#f5f5f5' }}>Resend</strong> for transactional email. Each provider has their own privacy policy and data practices.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>6. Cookies</h2>
          <p>We use session cookies to keep you logged in. We do not use tracking cookies or third-party advertising cookies.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>7. Your Rights</h2>
          <p>You can export or delete your data at any time by contacting us. If you close your account, your data is deleted within 30 days. Clients whose data you have collected may request deletion by contacting you directly — you are responsible for honoring such requests.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>8. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of material changes via email. Your continued use of BookRight after changes constitutes acceptance of the updated policy.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>9. Contact</h2>
          <p>Questions about privacy? Email us at <a href="mailto:support@bookright.app" style={{ color: '#c8a97e' }}>support@bookright.app</a>.</p>
        </section>

      </div>
    </div>
  )
}
