import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: clients } = await supabase
    .from('clients')
    .select('*, appointments(id, start_at, status)')
    .eq('artist_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Clients</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
          {clients?.length || 0} client{clients?.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {!clients?.length ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>👥</p>
          <p style={{ marginBottom: '0.5rem', fontWeight: 500, color: 'var(--foreground)' }}>No clients yet</p>
          <p style={{ fontSize: '0.875rem' }}>Clients appear here automatically when they book through your link.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {clients.map((client: Record<string, unknown>) => {
            const appts = client.appointments as { id: string; start_at: string; status: string }[]
            const upcoming = appts?.filter(a => new Date(a.start_at) > new Date() && a.status !== 'cancelled').length || 0
            const total = appts?.length || 0
            const lastAppt = appts?.filter(a => new Date(a.start_at) <= new Date()).sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime())[0]

            return (
              <Link key={client.id as string} href={`/dashboard/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Avatar */}
                    <div style={{
                      width: '2.5rem', height: '2.5rem', borderRadius: '50%', background: 'var(--muted)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: '1rem', color: 'var(--accent)', flexShrink: 0,
                    }}>
                      {(client.name as string).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{client.name as string}</p>
                      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.8125rem' }}>{client.email as string}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {upcoming > 0 && (
                      <p style={{ fontSize: '0.8125rem', color: '#22c55e', fontWeight: 600, marginBottom: '0.125rem' }}>
                        {upcoming} upcoming
                      </p>
                    )}
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                      {total} total · {lastAppt ? `Last: ${new Date(lastAppt.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'No past visits'}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
