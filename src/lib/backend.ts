import type { User } from '@supabase/supabase-js'
import type { Assignment, Client, Exercise, Profile, Routine, RoutineDay, RoutineExercise, WorkoutLog, WorkspaceData } from '../types'
import { supabase } from './supabase'

function clientOrThrow() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function throwOnError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function signIn(email: string, password: string, expectedRole: Profile['role']) {
  const client = clientOrThrow()
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  throwOnError(error)
  if (!data.user) throw new Error('No se pudo validar la cuenta.')

  let profile: Profile
  try {
    profile = await loadProfile(data.user)
  } catch (reason) {
    const { error: signOutError } = await client.auth.signOut()
    throwOnError(signOutError)
    throw reason
  }
  if (profile.role !== expectedRole) {
    const { error: signOutError } = await client.auth.signOut()
    throwOnError(signOutError)
    throw new Error(expectedRole === 'trainer'
      ? 'Esta cuenta no tiene acceso de administrador. Elige «Cliente» o contacta al responsable del espacio.'
      : 'Esta cuenta no tiene acceso de cliente. Elige «Entrenador / Admin».')
  }
}

export async function setPassword(password: string) {
  const { error } = await clientOrThrow().auth.updateUser({ password })
  throwOnError(error)
}

export async function signOut() {
  const { error } = await clientOrThrow().auth.signOut()
  throwOnError(error)
}

export async function loadProfile(user: User): Promise<Profile> {
  const client = clientOrThrow()
  const { data, error } = await client.from('profiles').select('id, full_name, role').eq('id', user.id).single()
  throwOnError(error)
  if (!data) throw new Error('No se encontró el perfil de esta cuenta.')
  if (data.role !== 'trainer' && data.role !== 'client') throw new Error('El perfil no tiene un rol válido.')
  return { id: data.id, fullName: data.full_name, role: data.role }
}

export async function loadWorkspace(): Promise<WorkspaceData> {
  const client = clientOrThrow()
  const [clients, exercises, routines, days, routineExercises, assignments, logs] = await Promise.all([
    client.from('clients').select('*,membership_status').order('created_at', { ascending: false }),
    client.from('exercises').select('*').order('name'),
    client.from('routines').select('*').order('created_at', { ascending: false }),
    client.from('routine_days').select('*').order('sort_order'),
    client.from('routine_exercises').select('*').order('sort_order'),
    client.from('routine_assignments').select('*').order('created_at', { ascending: false }),
    client.from('workout_logs').select('*').order('completed_at', { ascending: false }),
  ])
  for (const result of [clients, exercises, routines, days, routineExercises, assignments, logs]) throwOnError(result.error)

  const dayRows = days.data ?? []
  const moveRows = routineExercises.data ?? []
  const normalizedDays: RoutineDay[] = dayRows.map((day) => ({
    id: day.id,
    number: day.day_number,
    title: day.title,
    focus: day.focus,
    exercises: moveRows.filter((move) => move.routine_day_id === day.id).map((move): RoutineExercise => ({
      id: move.id,
      exerciseId: move.exercise_id ?? '',
      name: move.exercise_name,
      muscleGroup: move.muscle_group,
      equipment: move.equipment,
      instructions: move.instructions,
      videoUrl: move.video_url ?? '',
      mediaUrl: move.media_url ?? '',
      sets: move.sets,
      reps: move.reps,
      restSeconds: move.rest_seconds,
      tempo: move.tempo,
      suggestedLoad: move.suggested_load,
    })),
  }))

  const normalizedRoutines: Routine[] = (routines.data ?? []).map((routine) => ({
    id: routine.id,
    name: routine.name,
    goal: routine.goal,
    durationWeeks: routine.duration_weeks,
    archived: routine.is_archived,
    days: normalizedDays.filter((day) => dayRows.find((row) => row.id === day.id)?.routine_id === routine.id),
  }))

  return {
    clients: (clients.data ?? []).map((row): Client => ({
      id: row.id,
      name: row.name,
      email: row.email ?? '',
      phone: row.phone ?? '',
      goal: row.goal ?? '',
      level: row.level ?? 'Principiante',
      startDate: row.start_date,
      notes: row.notes ?? '',
      status: row.status,
      membership: row.membership ?? 'premium',
      membershipStatus: row.membership_status,
    })),
    exercises: (exercises.data ?? []).map((row): Exercise => ({
      id: row.id,
      name: row.name,
      muscleGroup: row.muscle_group,
      equipment: row.equipment,
      instructions: row.instructions,
      videoUrl: row.video_url ?? '',
      mediaUrl: row.media_url ?? '',
    })),
    routines: normalizedRoutines,
    assignments: (assignments.data ?? []).map((row): Assignment => ({
      id: row.id,
      clientId: row.client_id,
      routineId: row.routine_id,
      startDate: row.start_date,
      endDate: row.end_date,
      active: row.is_active,
    })),
    logs: (logs.data ?? []).map((row): WorkoutLog => ({
      id: row.id,
      clientId: row.client_id,
      assignmentId: row.assignment_id ?? '',
      routineDayId: row.routine_day_id ?? '',
      routineDayTitle: row.routine_day_title ?? '',
      routineDayFocus: row.routine_day_focus ?? '',
      completedAt: row.completed_at,
      comments: row.comments ?? '',
      entries: Array.isArray(row.exercise_results) ? row.exercise_results : [],
    })),
  }
}

export async function saveClient(clientData: Client, trainerId: string) {
  const { error } = await clientOrThrow().from('clients').upsert({
    id: clientData.id,
    trainer_id: trainerId,
    name: clientData.name,
    email: clientData.email.trim().toLowerCase() || null,
    phone: clientData.phone || null,
    goal: clientData.goal || null,
    level: clientData.level,
    start_date: clientData.startDate,
    notes: clientData.notes || null,
    status: clientData.status,
    membership: clientData.membership,
    membership_status: clientData.membershipStatus,
  })
  throwOnError(error)
}

export async function saveExercise(exercise: Exercise, trainerId: string) {
  const { error } = await clientOrThrow().from('exercises').upsert({
    id: exercise.id,
    trainer_id: trainerId,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    equipment: exercise.equipment,
    instructions: exercise.instructions,
    video_url: exercise.videoUrl || null,
    media_url: exercise.mediaUrl || null,
  })
  throwOnError(error)
}

export async function saveRoutine(routine: Routine) {
  const { error } = await clientOrThrow().rpc('save_routine_bundle', { p_routine: routine })
  throwOnError(error)
}

export async function updateRoutineArchive(routineId: string, archived: boolean) {
  const { error } = await clientOrThrow().from('routines').update({ is_archived: archived }).eq('id', routineId)
  throwOnError(error)
}

export async function saveAssignment(assignment: Assignment, trainerId: string) {
  const { error } = await clientOrThrow().from('routine_assignments').upsert({
    id: assignment.id,
    trainer_id: trainerId,
    client_id: assignment.clientId,
    routine_id: assignment.routineId,
    start_date: assignment.startDate,
    end_date: assignment.endDate,
    is_active: assignment.active,
  })
  throwOnError(error)
}

export async function saveWorkout(log: WorkoutLog) {
  const { error } = await clientOrThrow().from('workout_logs').insert({
    id: log.id,
    client_id: log.clientId,
    assignment_id: log.assignmentId || null,
    routine_day_id: log.routineDayId || null,
    routine_day_title: log.routineDayTitle,
    routine_day_focus: log.routineDayFocus,
    completed_at: log.completedAt,
    comments: log.comments || null,
    exercise_results: log.entries,
  })
  if (error) {
    if (/routine_day_(title|focus)|schema cache/i.test(error.message)) {
      throw new Error('Supabase aún no tiene actualizada la tabla de entrenamientos. Ejecuta supabase/migrations/20261112_link_client_account.sql en el SQL Editor de tu proyecto y vuelve a intentarlo.')
    }
    throw new Error(error.message)
  }
}

export async function inviteClient(clientId: string) {
  const { error } = await clientOrThrow().functions.invoke('invite-client', { body: { clientId } })
  if (error) {
    if (error.context instanceof Response) {
      const body: unknown = await error.context.json()
      if (typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string') throw new Error(body.error)
    }
    throw new Error(error.message)
  }
}
