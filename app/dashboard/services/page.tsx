'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Service {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price: number | null
  deposit_amount: number | null
  is_active: boolean
  sort_order: number
}

function formatDuration(min: number) {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `${h}h ${m}min` : `${h}hr`
}

function formatPrice(cents: number | null) {
  if (cents === null) return 'Price on request'
  return `$${(cents / 100).toFixed(2)}`
}

const DURATIONS = [15,30,45,60,90,120,150,180,240,300,360,420,480]

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: 60, price: '', deposit_amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('services').select('*').eq('artist_id', user.id).order('sort_order')
    setServices(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('services').update({ is_active: !current }).eq('id', id)
    setServices(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
  }

  async function deleteService(id: string) {
    if (!confirm('Delete this service? This cannot be undone.')) return
    const supabase = createClient()
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  function startEdit(service: Service) {
    setEditing(service.id)
    setAdding(false)
    setForm({
      name: service.name,
      description: service.description || '',
      duration_minutes: service.duration_minutes,
      price: service.price !== null ? (service.price / 100).toFixed(2) : '',
      deposit_amount: service.deposit_amount !== null ? (service.deposit_amount / 100).toFixed(2) : '',
    })
    setError('')
  }

  function startAdd() {
    setAdding(true)
    setEditing(null)
    setForm({ name: '', description: '', duration_minutes: 60, price: '' })
    setError('')
  }

  async function saveEdit() {
    if (!form.name) { setError('Service name is required.'); return }
    setSaving(true)
    const supabase = createClient()
    await supabase.from('services').update({
      name: form.name,
      description: form.description || null,
      duration_minutes: form.duration_minutes,
      price: form.price ? Math.round(parseFloat(form.price) * 100) : null,
      deposit_amount: form.deposit_amount ? Math.round(parseFloat(form.deposit_amount) * 100) : null,
    }).eq('id', editing!)
    await load()
    setEditing(null)
    setSaving(false)
  }

  async function saveNew() {
    if (!form.name) { setError('Service name is required.'); return }
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('services').insert({
      artist_id: user.id,
      name: form.name,
      description: form.description || null,
      duration_minutes: form.duration_minutes,
      price: form.price ? Math.round(parseFloat(form.price) * 100) : null,
      deposit_amount: form.deposit_amount ? Math.round(parseFloat(form.deposit_amount) * 100) : null,
      sort_order: services.length,
    })
    await load()
    setAdding(false)
    setSaving(false)
  }

  const FormFields = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Service name *</label>
        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Balayage, Full Sleeve Consult" />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Description (optional)</label>
        <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Shown to clients on your booking page" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Duration</label>
          <select value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) }))}>
            {DURATIONS.map(d => <option key={d} value={d}>{formatDuration(d)}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Price (blank = on request)</label>
          <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="150.00" min="0" step="0.01" />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Deposit required</label>
          <input type="number" value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))} placeholder="50.00 (optional)" min="0" step="0.01" />
        </div>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.375rem' }}>
        Clients will be shown your deposit instructions after booking. Leave blank for no deposit.
      </p>
      {error && <p className="error-text">{error}</p>}
    </div>
  )

  if (loading) return <div style={{ color: 'var(--muted-foreground)', padding: '2rem' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>Services</h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>Manage what clients can book.</p>
        </div>
        {!adding && (
          <button className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={startAdd}>
            + Add service
          </button>
        )}
      </div>

      {/* Add new form */}
      {adding && (
        <div className="card" style={{ marginBottom: '1rem', border: '1px solid var(--accent)' }}>
          <p style={{ fontWeight: 600, marginBottom: '1rem' }}>New service</p>
          <FormFields />
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={saveNew} disabled={saving}>
              {saving ? 'Saving…' : 'Save service'}
            </button>
            <button className="btn-secondary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Service list */}
      {services.length === 0 && !adding ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)' }}>
          <p>No services yet. Add one above.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {services.map(service => (
            <div key={service.id} className="card" style={{ opacity: service.is_active ? 1 : 0.5 }}>
              {editing === service.id ? (
                <>
                  <FormFields />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                    <button className="btn-primary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={saveEdit} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="btn-secondary" style={{ width: 'auto', padding: '0.625rem 1.25rem' }} onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                      <p style={{ fontWeight: 600 }}>{service.name}</p>
                      {!service.is_active && <span style={{ fontSize: '0.7rem', background: 'var(--muted)', color: 'var(--muted-foreground)', padding: '0.125rem 0.5rem', borderRadius: '999px' }}>Hidden</span>}
                    </div>
                    {service.description && <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{service.description}</p>}
                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>
                      {formatDuration(service.duration_minutes)} · {formatPrice(service.price)}
                      {service.deposit_amount ? (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--accent)', fontWeight: 500 }}>
                          · ${(service.deposit_amount / 100).toFixed(0)} deposit
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => toggleActive(service.id, service.is_active)}
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer' }}>
                      {service.is_active ? 'Hide' : 'Show'}
                    </button>
                    <button onClick={() => startEdit(service)}
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--foreground)', cursor: 'pointer' }}>
                      Edit
                    </button>
                    <button onClick={() => deleteService(service.id)}
                      style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid var(--border)', background: 'transparent', color: 'var(--destructive)', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
