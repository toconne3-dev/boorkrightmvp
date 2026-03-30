import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import FormBuilder, { FormField } from '../../_builder/FormBuilder'

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: form } = await supabase
    .from('consent_forms')
    .select('id, name, fields')
    .eq('id', id)
    .eq('artist_id', user.id)
    .eq('is_template', false)
    .single()

  if (!form) notFound()

  return (
    <FormBuilder
      formId={form.id}
      initialName={form.name}
      initialFields={form.fields as FormField[]}
    />
  )
}
