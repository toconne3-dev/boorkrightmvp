import Link from 'next/link'

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif', color: '#f5f5f5' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#c8a97e', textDecoration: 'none', fontSize: '0.875rem' }}>← BookRight</Link>
      </div>

      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Terms of Service</h1>
      <p style={{ color: '#888', marginBottom: '2.5rem', fontSize: '0.875rem' }}>Last updated: June 2025</p>

      <div style={{ lineHeight: 1.7, color: '#ccc', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>1. Acceptance of Terms</h2>
          <p>By accessing or using BookRight (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>2. Description of Service</h2>
          <p>BookRight is a scheduling and client management platform for independent service professionals. It provides booking pages, appointment management, and consent form tools. BookRight is not a licensed healthcare, legal, or financial service provider.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>3. Your Account</h2>
          <p>You are responsible for maintaining the security of your account credentials. You must provide accurate and complete information when creating your account. You are responsible for all activity that occurs under your account.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>4. Acceptable Use</h2>
          <p>You agree not to use BookRight for any unlawful purpose, to harass or harm others, to transmit spam or malicious code, or to violate any applicable laws or regulations. We reserve the right to suspend accounts that violate these terms.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>5. Client Data and Consent Forms</h2>
          <p>You are solely responsible for the consent forms you create and any client health or personal information you collect through the platform. BookRight provides tools only and is not a HIPAA-covered entity. You must comply with all applicable laws regarding the collection, storage, and use of client information in your jurisdiction.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>6. Deposits and Payments</h2>
          <p>BookRight facilitates communication of deposit instructions but does not process payments between artists and clients. Any deposit arrangements are solely between you and your clients. BookRight is not responsible for disputed, missing, or fraudulent deposits.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>7. Subscription and Billing</h2>
          <p>Pro plan subscriptions are billed monthly and managed via Stripe. You may cancel at any time through the billing portal. Refunds are not issued for partial billing periods. We reserve the right to change pricing with 30 days&apos; notice.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>8. Disclaimer of Warranties</h2>
          <p>BookRight is provided &ldquo;as is&rdquo; without warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free. We are not liable for any lost data, lost revenue, or other damages arising from your use of the service.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>9. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, BookRight&apos;s liability to you is limited to the amount you paid us in the three months prior to the event giving rise to the claim.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>10. Changes to Terms</h2>
          <p>We may update these terms from time to time. We will notify you of material changes via email. Continued use of the service after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f5f5f5', marginBottom: '0.625rem' }}>11. Contact</h2>
          <p>Questions about these terms? Email us at <a href="mailto:support@bookright.app" style={{ color: '#c8a97e' }}>support@bookright.app</a>.</p>
        </section>

      </div>
    </div>
  )
}
