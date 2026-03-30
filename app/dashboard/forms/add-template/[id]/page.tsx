import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// This page copies a global template into the artist's own forms, then redirects to the form list.
export default async function AddTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Fetch the template
  const { data: template } = await supabase
    .from('consent_forms')
    .select('name, fields')
    .eq('id', id)
    .eq('is_template', true)
    .single()

  if (!template) redirect('/dashboard/forms')

  // Check if artist already has a form with this name
  const { data: existing } = await supabase
    .from('consent_forms')
    .select('id')
    .eq('artist_id', user.id)
    .eq('name', template.name)
    .eq('is_template', false)
    .maybeSingle()

  if (!existing) {
    // Copy template into artist's forms
    await supabase.from('consent_forms').insert({
      artist_id: user.id,
      name: template.name,
      fields: template.fields,
      is_template: false,
    })
  }

  redirect('/dashboard/forms')
}
