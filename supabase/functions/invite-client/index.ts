import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const response = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return response(405, { error: 'Método no permitido.' })

  const url = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appUrl = Deno.env.get('APP_URL')
  if (!url || !anonKey || !serviceRoleKey || !appUrl) return response(500, { error: 'Falta configurar la función de invitaciones o APP_URL.' })

  let redirectTo: string
  try {
    const redirect = new URL(appUrl)
    const localHttp = redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname)
    if (redirect.protocol !== 'https:' && !localHttp) throw new Error('URL insegura')
    redirect.searchParams.set('activation', 'invite')
    redirectTo = redirect.toString()
  } catch {
    return response(500, { error: 'APP_URL no es una URL válida y segura.' })
  }

  const authorization = request.headers.get('Authorization')
  if (!authorization) return response(401, { error: 'Inicia sesión para invitar a un cliente.' })

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await callerClient.auth.getUser()
  if (userError || !userData.user) return response(401, { error: 'La sesión no es válida.' })

  const admin = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: trainer, error: trainerError } = await admin.from('profiles').select('role').eq('id', userData.user.id).single()
  if (trainerError || trainer?.role !== 'trainer') return response(403, { error: 'Solo un entrenador puede enviar invitaciones.' })

  let body: { clientId?: string }
  try {
    body = await request.json()
  } catch {
    return response(400, { error: 'La solicitud no tiene un formato válido.' })
  }
  if (!body.clientId) return response(400, { error: 'Selecciona un cliente para invitar.' })

  const { data: client, error: clientError } = await admin
    .from('clients')
    .select('id, trainer_id, profile_id, name, email')
    .eq('id', body.clientId)
    .eq('trainer_id', userData.user.id)
    .single()
  if (clientError || !client) return response(404, { error: 'No se encontró ese cliente en tu comunidad.' })
  if (client.profile_id) return response(409, { error: 'Este cliente ya tiene una cuenta vinculada.' })
  if (!client.email) return response(400, { error: 'Añade un correo electrónico al perfil del cliente.' })

  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(client.email, {
    data: { full_name: client.name },
    redirectTo,
  })
  if (inviteError || !invitation.user) return response(400, { error: inviteError?.message ?? 'No se pudo enviar la invitación.' })

  const { error: profileError } = await admin.from('profiles').update({ full_name: client.name, role: 'client' }).eq('id', invitation.user.id)
  if (profileError) return response(500, { error: `La invitación se envió, pero no se pudo asignar el rol de cliente: ${profileError.message}` })

  const { data: linkedClient, error: linkError } = await admin.from('clients').update({ profile_id: invitation.user.id }).eq('id', client.id).eq('trainer_id', userData.user.id).is('profile_id', null).select('id').maybeSingle()
  if (linkError || !linkedClient) return response(500, { error: `La invitación se envió, pero no se pudo vincular el perfil: ${linkError?.message ?? 'el cliente ya está vinculado'}. Contacta al administrador del sistema.` })

  return response(200, { message: 'Invitación enviada y cuenta vinculada.' })
})
