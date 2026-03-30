import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface FormField { id: string; type: string; label: string; required: boolean }

export default async function FormsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: artist } = await supabase.from('artists').select('plan').eq('id', user.id).single()

  const { data: forms } = await supabase
    .from('consent_forms')
    .select('*')
    .eq('artist_id', user.id)
    .eq('is_template', false)
    .order('created_at')

  const { data: templates } = await supabase
    .from('consent_forms')
    .select('*')
    .eq('is_template', true)
    .order('name')

  const isPro = artist?.plan === 'pro'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Consent Forms</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Clients fill these out before every appointment.</p>
        </div>
        <Link href="/dashboard/forms/new"
          style={{ background: 'var(--accent)', color: '#0a0a0a', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
          + New form
        </Link>
      </div>

      {/* HIPAA disclaimer */}
      <div style={{ background: 'rgba(200,169,126,0.08)', border: '1px solid rgba(200,169,126,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--accent)' }}>Reminder:</strong> These forms are tools only, not legal advice. You are responsible for ensuring your forms comply with laws in your area. Any client health information collected through BookRight is your responsibility to manage. BookRight is not a HIPAA-covered entity.
        </p>
      </div>

      {/* Active forms */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Your forms</h2>
        {!forms?.length ? (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted-foreground)' }}>
            <p style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>📋</p>
            <p style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}>No forms yet</p>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Build a custom form from scratch or start from a template below.
            </p>
            <Link href="/dashboard/forms/new"
              style={{ background: 'var(--accent)', color: '#0a0a0a', fontWeight: 600, padding: '0.625rem 1.25rem', borderRadius: '0.5rem', textDecoration: 'none', fontSize: '0.875rem' }}>
              + Build a form
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {forms.map((form: Record<string, unknown>) => {
              const fields = form.fields as FormField[]
              const sigField = fields.find(f => f.type === 'signature')
              return (
                <div key={form.id as string} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{form.name as string}</p>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                        {fields.length} question{fields.length !== 1 ? 's' : ''} · {sigField ? '✓ Signature included' : 'No signature field'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/dashboard/forms/${form.id as string}/edit`}
                        style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', color: 'var(--foreground)', textDecoration: 'none' }}>
                        Edit
                      </Link>
                    </div>
                  </div>

                  {/* Question preview */}
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                    {fields.slice(0, 4).map((f: FormField) => (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted-foreground)', background: 'var(--muted)', padding: '0.125rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                          {f.type.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.label}</span>
                        {f.required && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', flexShrink: 0 }}>*</span>}
                      </div>
                    ))}
                    {fields.length > 4 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>+{fields.length - 4} more questions</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Templates */}
      <div>
        <h2 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>Start from a template</h2>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
          {isPro ? 'All templates included with Pro.' : 'Free plan includes 1 template. '}
          {!isPro && <Link href="/dashboard/upgrade" style={{ color: 'var(--accent)', fontWeight: 500 }}>Upgrade for all →</Link>}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {templates?.map((tpl: Record<string, unknown>, i: number) => {
            const locked = !isPro && i > 0
            const alreadyAdded = forms?.some(f => (f.name as string) === (tpl.name as string))
            const fields = tpl.fields as FormField[]
            return (
              <div key={tpl.id as string} className="card" style={{ opacity: locked ? 0.5 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <p style={{ fontWeight: 600 }}>{tpl.name as string}</p>
                      {locked && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(200,169,126,0.15)', color: 'var(--accent)', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>Pro</span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                      {fields.length} questions
                    </p>
                  </div>
                  {locked ? (
                    <Link href="/dashboard/upgrade"
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', background: 'rgba(200,169,126,0.12)', color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
                      Unlock with Pro
                    </Link>
                  ) : alreadyAdded ? (
                    <span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>✓ Added</span>
                  ) : (
                    <Link href={`/dashboard/forms/add-template/${tpl.id as string}`}
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', color: 'var(--foreground)', textDecoration: 'none' }}>
                      Add to my forms
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
