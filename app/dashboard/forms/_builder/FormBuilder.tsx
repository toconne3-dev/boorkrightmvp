'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────
export type FieldType = 'text' | 'textarea' | 'yes_no' | 'checkbox' | 'multiple_choice' | 'date' | 'signature'

export interface FormField {
  id: string
  type: FieldType
  label: string
  required: boolean
  options?: string[]
}

const FIELD_TYPES: { type: FieldType; icon: string; label: string; description: string }[] = [
  { type: 'text',            icon: '📝', label: 'Short text',      description: 'Single line answer' },
  { type: 'textarea',        icon: '📄', label: 'Long text',       description: 'Multi-line answer' },
  { type: 'yes_no',          icon: '✅', label: 'Yes / No',        description: 'Two-option toggle' },
  { type: 'checkbox',        icon: '☑️', label: 'Checkbox',        description: 'Consent / agreement' },
  { type: 'multiple_choice', icon: '🔘', label: 'Multiple choice', description: 'Pick one from a list' },
  { type: 'date',            icon: '📅', label: 'Date',            description: 'Date picker' },
  { type: 'signature',       icon: '✍️', label: 'Signature',       description: 'Draw-to-sign pad' },
]

const TYPE_LABEL: Record<FieldType, string> = {
  text: 'Short text', textarea: 'Long text', yes_no: 'Yes/No',
  checkbox: 'Checkbox', multiple_choice: 'Multiple choice', date: 'Date', signature: 'Signature',
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

// ─── Field editor (inline) ────────────────────────────────────────────────────
function FieldEditor({
  field, onChange, onDelete, onMove, isFirst, isLast,
}: {
  field: FormField
  onChange: (updated: FormField) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
  isFirst: boolean
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [newOption, setNewOption] = useState('')

  function addOption() {
    const val = newOption.trim()
    if (!val) return
    onChange({ ...field, options: [...(field.options || []), val] })
    setNewOption('')
  }

  function removeOption(i: number) {
    onChange({ ...field, options: (field.options || []).filter((_, idx) => idx !== i) })
  }

  return (
    <div style={{
      borderRadius: '0.625rem', border: `1px solid ${expanded ? 'rgba(200,169,126,0.4)' : 'var(--border)'}`,
      background: expanded ? 'rgba(200,169,126,0.04)' : 'var(--card)',
      overflow: 'hidden', transition: 'border-color 0.15s',
    }}>
      {/* Field row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1rem' }}>
        {/* Reorder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <button type="button" onClick={() => onMove(-1)} disabled={isFirst}
            style={{ background: 'none', border: 'none', cursor: isFirst ? 'not-allowed' : 'pointer', color: isFirst ? 'var(--border)' : 'var(--muted-foreground)', fontSize: '0.8rem', padding: '1px 4px', lineHeight: 1 }}>▲</button>
          <button type="button" onClick={() => onMove(1)} disabled={isLast}
            style={{ background: 'none', border: 'none', cursor: isLast ? 'not-allowed' : 'pointer', color: isLast ? 'var(--border)' : 'var(--muted-foreground)', fontSize: '0.8rem', padding: '1px 4px', lineHeight: 1 }}>▼</button>
        </div>

        {/* Type badge */}
        <span style={{
          fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px',
          background: 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', flexShrink: 0,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {TYPE_LABEL[field.type]}
        </span>

        {/* Label */}
        <span style={{ flex: 1, fontSize: '0.9375rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {field.label || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Untitled question</span>}
        </span>

        {field.required && (
          <span style={{ color: 'var(--accent)', fontSize: '0.8125rem', flexShrink: 0 }}>*</span>
        )}

        {/* Actions */}
        <button type="button" onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted-foreground)', borderRadius: '0.375rem', padding: '0.25rem 0.625rem', cursor: 'pointer', fontSize: '0.8125rem', flexShrink: 0 }}>
          {expanded ? 'Done' : 'Edit'}
        </button>
        <button type="button" onClick={onDelete}
          style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem', flexShrink: 0, lineHeight: 1 }}>
          ✕
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {/* Label */}
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Question label</label>
              <input
                type="text"
                value={field.label}
                onChange={e => onChange({ ...field, label: e.target.value })}
                placeholder={field.type === 'checkbox' ? 'e.g. I agree to the terms above' : 'e.g. Do you have any allergies?'}
                autoFocus
              />
            </div>

            {/* Multiple choice options */}
            {field.type === 'multiple_choice' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--foreground)' }}>Options</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '0.5rem' }}>
                  {(field.options || []).map((opt, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ flex: 1, padding: '0.5rem 0.75rem', background: 'var(--muted)', borderRadius: '0.375rem', fontSize: '0.875rem' }}>{opt}</span>
                      <button type="button" onClick={() => removeOption(i)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.875rem', padding: '0.25rem' }}>✕</button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text" value={newOption} placeholder="Add option…"
                    onChange={e => setNewOption(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
                    style={{ flex: 1 }}
                  />
                  <button type="button" onClick={addOption} className="btn-secondary" style={{ whiteSpace: 'nowrap', padding: '0.5rem 0.875rem' }}>
                    + Add
                  </button>
                </div>
              </div>
            )}

            {/* Required toggle */}
            {field.type !== 'signature' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={e => onChange({ ...field, required: e.target.checked })}
                  />
                  <span className="toggle-slider" />
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  Required — client must answer this question
                </span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────
export default function FormBuilder({
  initialName = '',
  initialFields = [],
  formId,
}: {
  initialName?: string
  initialFields?: FormField[]
  formId?: string // if set = editing, else = creating
}) {
  const router = useRouter()
  const [formName, setFormName] = useState(initialName)
  const [fields, setFields] = useState<FormField[]>(initialFields)
  const [showTypePanel, setShowTypePanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  function addField(type: FieldType) {
    const newField: FormField = {
      id: uid(),
      type,
      label: '',
      required: type !== 'checkbox' && type !== 'signature',
      options: type === 'multiple_choice' ? [] : undefined,
    }
    setFields(prev => [...prev, newField])
    setShowTypePanel(false)
  }

  function updateField(id: string, updated: FormField) {
    setFields(prev => prev.map(f => f.id === id ? updated : f))
  }

  function deleteField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  const validate = useCallback(() => {
    if (!formName.trim()) return 'Please give your form a name.'
    if (fields.length === 0) return 'Add at least one question.'
    const hasBlankLabel = fields.some(f => !f.label.trim())
    if (hasBlankLabel) return 'All questions need a label.'
    const mcWithNoOptions = fields.find(f => f.type === 'multiple_choice' && (!f.options || f.options.length < 2))
    if (mcWithNoOptions) return `"${mcWithNoOptions.label || 'Multiple choice field'}" needs at least 2 options.`
    return null
  }, [formName, fields])

  async function handleSave() {
    const validationError = validate()
    if (validationError) { setError(validationError); return }
    setError('')
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not logged in.'); setSaving(false); return }

    if (formId) {
      // Update existing
      const { error: updateError } = await supabase
        .from('consent_forms')
        .update({ name: formName.trim(), fields })
        .eq('id', formId)
        .eq('artist_id', user.id)
      if (updateError) { setError(updateError.message); setSaving(false); return }
    } else {
      // Create new
      const { error: insertError } = await supabase
        .from('consent_forms')
        .insert({ artist_id: user.id, name: formName.trim(), fields, is_template: false })
      if (insertError) { setError(insertError.message); setSaving(false); return }
    }

    setSaving(false)
    router.push('/dashboard/forms')
  }

  const hasSignature = fields.some(f => f.type === 'signature')

  return (
    <div style={{ maxWidth: '680px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            {formId ? 'Edit form' : 'New consent form'}
          </h1>
          <p style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>
            Build your intake form field by field. Changes only affect new bookings.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={() => setShowPreview(p => !p)} className="btn-secondary">
            {showPreview ? 'Hide preview' : 'Preview'}
          </button>
          <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : formId ? 'Save changes' : 'Create form'}
          </button>
        </div>
      </div>

      {/* Form name */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Form name</label>
          <input
            type="text"
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder="e.g. Tattoo Consent & Intake Form"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '0.5rem', color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Two column: builder left, preview right */}
      <div style={{ display: showPreview ? 'grid' : 'block', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Builder column */}
        <div>
          {/* Fields list */}
          {fields.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {fields.map((field, idx) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  onChange={updated => updateField(field.id, updated)}
                  onDelete={() => deleteField(field.id)}
                  onMove={dir => moveField(field.id, dir)}
                  isFirst={idx === 0}
                  isLast={idx === fields.length - 1}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {fields.length === 0 && !showTypePanel && (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
              <p style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</p>
              <p style={{ fontWeight: 500, color: 'var(--foreground)', marginBottom: '0.375rem' }}>No questions yet</p>
              <p style={{ fontSize: '0.875rem' }}>Click &quot;Add question&quot; to start building your form.</p>
            </div>
          )}

          {/* Add question panel */}
          {showTypePanel ? (
            <div className="card" style={{ borderColor: 'rgba(200,169,126,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Choose question type</p>
                <button type="button" onClick={() => setShowTypePanel(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '1.125rem', lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {FIELD_TYPES.map(ft => {
                  const alreadyHasSig = ft.type === 'signature' && hasSignature
                  return (
                    <button
                      key={ft.type}
                      type="button"
                      disabled={alreadyHasSig}
                      onClick={() => addField(ft.type)}
                      style={{
                        textAlign: 'left', padding: '0.75rem 0.875rem', borderRadius: '0.5rem',
                        border: '1px solid var(--border)', background: 'var(--muted)',
                        cursor: alreadyHasSig ? 'not-allowed' : 'pointer', opacity: alreadyHasSig ? 0.4 : 1,
                        transition: 'all 0.15s',
                      }}>
                      <p style={{ fontSize: '1.125rem', marginBottom: '0.2rem' }}>{ft.icon}</p>
                      <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.1rem' }}>{ft.label}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>{ft.description}</p>
                      {alreadyHasSig && <p style={{ fontSize: '0.7rem', color: 'var(--accent)', marginTop: '0.25rem' }}>Already added</p>}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowTypePanel(true)}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '0.625rem',
                border: '1px dashed var(--border)', background: 'transparent',
                color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: '0.9375rem',
                transition: 'all 0.15s',
              }}>
              + Add question
            </button>
          )}

          {/* Signature reminder */}
          {fields.length > 0 && !hasSignature && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '0.875rem', textAlign: 'center' }}>
              💡 Tip: Add a <strong>Signature</strong> field so clients sign off on the form.
            </p>
          )}

          {/* Save bar */}
          {fields.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.625rem' }}>
              <button type="button" onClick={() => router.push('/dashboard/forms')} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : formId ? 'Save changes' : 'Create form'}
              </button>
            </div>
          )}
        </div>

        {/* Preview column */}
        {showPreview && (
          <div>
            <div style={{ position: 'sticky', top: '1rem' }}>
              <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: '1rem', color: 'var(--accent)' }}>
                Client preview
              </p>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <p style={{ fontWeight: 700, fontSize: '1.0625rem', marginBottom: '0.25rem' }}>{formName || 'Untitled form'}</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  Please answer all required questions honestly.
                </p>
                {fields.length === 0 ? (
                  <p style={{ color: 'var(--border)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>No questions yet</p>
                ) : fields.map(field => (
                  <div key={field.id} style={{ marginBottom: '1rem', padding: '0.875rem', background: 'var(--muted)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                      {field.label || <span style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}>Untitled</span>}
                      {field.required && <span style={{ color: 'var(--accent)', marginLeft: '0.25rem' }}>*</span>}
                    </p>
                    {field.type === 'text' && <div style={{ height: '2rem', background: 'var(--card)', borderRadius: '0.375rem', border: '1px solid var(--border)' }} />}
                    {field.type === 'textarea' && <div style={{ height: '4.5rem', background: 'var(--card)', borderRadius: '0.375rem', border: '1px solid var(--border)' }} />}
                    {field.type === 'yes_no' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {['Yes', 'No'].map(o => <span key={o} style={{ flex: 1, padding: '0.5rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '0.375rem', fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{o}</span>)}
                      </div>
                    )}
                    {field.type === 'checkbox' && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}><div style={{ width: 18, height: 18, border: '1px solid var(--border)', borderRadius: 3, flexShrink: 0 }} /><span style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)' }}>{field.label}</span></div>}
                    {field.type === 'multiple_choice' && (field.options || []).map(o => (
                      <div key={o} style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--border)', borderRadius: '0.375rem', fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '0.25rem' }}>{o}</div>
                    ))}
                    {field.type === 'date' && <div style={{ height: '2rem', background: 'var(--card)', borderRadius: '0.375rem', border: '1px solid var(--border)', width: '160px' }} />}
                    {field.type === 'signature' && <div style={{ height: '80px', background: 'var(--card)', borderRadius: '0.375rem', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: 'var(--border)', fontSize: '0.8125rem' }}>Draw signature here</span></div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
