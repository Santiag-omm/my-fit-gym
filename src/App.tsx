import { useEffect, useMemo, useState } from 'react'
import {
  Activity, Check, ClipboardList, Dumbbell, LayoutDashboard,
  LogOut, Menu, Sparkles, Users, X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { makeId } from './lib/id'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { inviteClient, loadProfile, loadWorkspace, saveAssignment, saveClient, saveExercise, saveRoutine, saveWorkout, setPassword, signIn, signOut, updateRoutineArchive } from './lib/backend'
import type { Assignment, Client, Exercise, Profile, Routine, WorkoutEntry, WorkoutLog, WorkspaceData } from './types'
import { Avatar, Button } from './components/ui'
import { LoginView } from './components/LoginView'
import { ActivateAccount } from './components/ActivateAccount'
import { DashboardView } from './components/DashboardView'
import { ClientsView } from './components/ClientsView'
import { ClientFormModal, AssignmentModal } from './components/ClientFormModal'
import { RoutinesView } from './components/RoutinesView'
import { RoutineFormModal } from './components/RoutineFormModal'
import { ExercisesView } from './components/ExercisesView'
import { ExerciseFormModal } from './components/ExerciseFormModal'
import { ClientPortal } from './components/ClientPortal'
import './style.css'

type View = 'dashboard' | 'clients' | 'routines' | 'exercises' | 'portal'
type ToastMessage = { type: 'success' | 'error' | 'info'; text: string }

const blankWorkspace: WorkspaceData = { clients: [], exercises: [], routines: [], assignments: [], logs: [] }

const navigation = [
  { id: 'dashboard' as const, label: 'Inicio', icon: LayoutDashboard },
  { id: 'clients' as const, label: 'Clientes', icon: Users },
  { id: 'routines' as const, label: 'Rutinas', icon: ClipboardList },
  { id: 'exercises' as const, label: 'Ejercicios', icon: Dumbbell },
]

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [workspaceLoading, setWorkspaceLoading] = useState(isSupabaseConfigured)
  const [workspaceError, setWorkspaceError] = useState('')
  const [loadedUserId, setLoadedUserId] = useState('')
  const [data, setData] = useState<WorkspaceData>(blankWorkspace)
  const [view, setView] = useState<View>('dashboard')
  const [activation, setActivation] = useState(() => new URLSearchParams(window.location.search).get('activation') === 'invite')
  const [workspaceVersion, setWorkspaceVersion] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [clientModal, setClientModal] = useState<Client | 'new' | null>(null)
  const [exerciseModal, setExerciseModal] = useState<Exercise | 'new' | null>(null)
  const [routineModal, setRoutineModal] = useState<Routine | 'new' | null>(null)
  const [assignmentModal, setAssignmentModal] = useState<{ client?: Client; routineId?: string } | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const currentRole = profile?.role

  useEffect(() => {
    if (!supabase) return
    let active = true
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null)
        setAuthReady(true)
      }
    })
    void supabase.auth.getSession().then(({ data: sessionData, error }) => {
      if (!active) return
      if (error) setAuthError(error.message)
      setUser(sessionData.session?.user ?? null)
      setAuthReady(true)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!supabase || !authReady) return
    if (!user) {
      setProfile(null)
      setData(blankWorkspace)
      setLoadedUserId('')
      setWorkspaceError('')
      setWorkspaceLoading(false)
      return
    }
    let active = true
    if (loadedUserId !== user.id || profile?.role === 'client') setWorkspaceLoading(true)
    setWorkspaceError('')
    void (async () => {
      try {
        const loadedProfile = await loadProfile(user)
        const loadedData = await loadWorkspace()
        if (!active) return
        setProfile(loadedProfile)
        setData(loadedData)
        if (loadedUserId !== user.id) setView(loadedProfile.role === 'client' ? 'portal' : 'dashboard')
        setLoadedUserId(user.id)
        setWorkspaceLoading(false)
      } catch (reason) {
        if (!active) return
        setWorkspaceError(reason instanceof Error ? reason.message : 'No se pudieron cargar tus datos.')
        setProfile(null)
        setData(blankWorkspace)
        setLoadedUserId(user.id)
        setWorkspaceLoading(false)
      }
    })()
    return () => { active = false }
  }, [authReady, user, workspaceVersion])

  useEffect(() => {
    if (!supabase || !user || !profile) return
    const channel = supabase.channel(`clients-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients', filter: `${profile.role === 'trainer' ? 'trainer_id' : 'profile_id'}=eq.${user.id}` }, () => {
        if (profile.role === 'client') setWorkspaceLoading(true)
        setWorkspaceVersion((version) => version + 1)
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setToast({ type: 'error', text: 'No se pudo actualizar el estado en tiempo real. Recarga la página para consultar los cambios.' })
      })
    return () => { void supabase?.removeChannel(channel) }
  }, [user, profile?.role])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeClient = useMemo(() => {
    return profile?.role === 'client' ? data.clients[0] : undefined
  }, [data.clients, profile?.role])
  const activeAssignment = useMemo(() => {
    if (!activeClient) return undefined
    const today = new Date().toISOString().slice(0, 10)
    return data.assignments.filter((assignment) => assignment.clientId === activeClient.id && assignment.active && assignment.startDate <= today && assignment.endDate >= today).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
  }, [activeClient, data.assignments])
  const activeRoutine = data.routines.find((routine) => routine.id === activeAssignment?.routineId)

  const updateWorkspace = (updater: (current: WorkspaceData) => WorkspaceData) => setData((current) => updater(current))

  const handleSignIn = async (email: string, password: string, role: Profile['role']): Promise<boolean> => {
    setAuthLoading(true)
    setAuthError('')
    try { await signIn(email, password, role); return true }
    catch (reason) { setAuthError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesión.'); return false }
    finally { setAuthLoading(false) }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try { await signOut(); setToast({ type: 'success', text: 'Has cerrado sesión.' }) }
    catch (reason) { setToast({ type: 'error', text: reason instanceof Error ? reason.message : 'No se pudo cerrar sesión.' }) }
    finally { setSigningOut(false) }
  }

  const saveClientRecord = async (value: Client) => {
    const saved = { ...value, id: value.id || makeId('client') }
    if (!user || profile?.role !== 'trainer') throw new Error('Solo un entrenador puede gestionar clientes.')
    await saveClient(saved, user.id)
    updateWorkspace((current) => ({ ...current, clients: current.clients.some((client) => client.id === saved.id) ? current.clients.map((client) => client.id === saved.id ? saved : client) : [saved, ...current.clients] }))
    if (value.id) {
      setToast({ type: 'success', text: 'Cliente y membresía actualizados.' })
    } else {
      try {
        await inviteClient(saved.id)
        setToast({ type: 'success', text: 'Cliente creado e invitación enviada.' })
      } catch (reason) {
        setToast({ type: 'error', text: `Cliente creado, pero la invitación no se completó: ${reason instanceof Error ? reason.message : 'error desconocido'}. Revisa la cuenta antes de reintentar.` })
      }
    }
  }

  const saveExerciseRecord = async (value: Exercise) => {
    const saved = { ...value, id: value.id || makeId('exercise') }
    if (!user || profile?.role !== 'trainer') throw new Error('Solo un entrenador puede gestionar ejercicios.')
    await saveExercise(saved, user.id)
    updateWorkspace((current) => ({ ...current, exercises: value.id ? current.exercises.map((exercise) => exercise.id === saved.id ? saved : exercise) : [...current.exercises, saved] }))
    setToast({ type: 'success', text: value.id ? 'Ejercicio actualizado.' : 'Ejercicio añadido al catálogo.' })
  }

  const saveRoutineRecord = async (value: Routine) => {
    const saved = { ...value, id: value.id || makeId('routine') }
    const alreadyExists = data.routines.some((routine) => routine.id === saved.id)
    if (!user || profile?.role !== 'trainer') throw new Error('Solo un entrenador puede gestionar rutinas.')
    await saveRoutine(saved)
    updateWorkspace((current) => ({
      ...current,
      routines: current.routines.some((routine) => routine.id === saved.id)
        ? current.routines.map((routine) => routine.id === saved.id ? saved : routine)
        : [saved, ...current.routines],
    }))
    setToast({ type: 'success', text: alreadyExists ? 'Rutina actualizada.' : 'Rutina creada. Ya puedes asignarla.' })
  }

  const assignRoutine = async (clientId: string, routineId: string, startDate: string, endDate: string) => {
    const assignment: Assignment = { id: makeId('assignment'), clientId, routineId, startDate, endDate, active: true }
    const previous = data.assignments.filter((item) => item.clientId === clientId && item.active)
    if (!user || profile?.role !== 'trainer') throw new Error('Solo un entrenador puede asignar rutinas.')
    for (const prior of previous) await saveAssignment({ ...prior, active: false }, user.id)
    await saveAssignment(assignment, user.id)
    updateWorkspace((current) => ({ ...current, assignments: [...current.assignments.map((item) => item.clientId === clientId && item.active ? { ...item, active: false } : item), assignment] }))
    setToast({ type: 'success', text: 'La rutina quedó asignada con sus fechas.' })
  }

  const duplicateRoutine = (routine: Routine) => {
    const copy: Routine = {
      ...structuredClone(routine),
      id: makeId('routine'),
      name: `${routine.name} · copia`,
      archived: false,
      days: routine.days.map((day) => ({
        ...day,
        id: makeId('day'),
        exercises: day.exercises.map((move) => ({ ...move, id: makeId('move') })),
      })),
    }
    void saveRoutineRecord(copy).then(() => setRoutineModal(copy)).catch((reason: unknown) => setToast({ type: 'error', text: reason instanceof Error ? reason.message : 'No se pudo duplicar la rutina.' }))
  }

  const toggleArchive = async (routine: Routine) => {
    const updated = { ...routine, archived: !routine.archived }
    try {
      if (!user || profile?.role !== 'trainer') throw new Error('Solo un entrenador puede archivar rutinas.')
      await updateRoutineArchive(routine.id, updated.archived)
      updateWorkspace((current) => ({ ...current, routines: current.routines.map((item) => item.id === routine.id ? updated : item) }))
      setToast({ type: 'success', text: updated.archived ? 'Rutina archivada. El historial se conserva.' : 'Rutina restaurada.' })
    } catch (reason) {
      setToast({ type: 'error', text: reason instanceof Error ? reason.message : 'No se pudo actualizar la rutina.' })
    }
  }

  const completeWorkout = async (dayId: string, comments: string, entries: WorkoutEntry[]) => {
    if (!activeClient || activeClient.membershipStatus !== 'active' || !activeAssignment) throw new Error('Necesitas una membresía activa y una rutina asignada.')
    const day = activeRoutine?.days.find((item) => item.id === dayId)
    if (!day) throw new Error('No se encontró el día de entrenamiento seleccionado.')
    const log: WorkoutLog = {
      id: makeId('log'),
      clientId: activeClient.id,
      assignmentId: activeAssignment.id,
      routineDayId: dayId,
      routineDayTitle: day.title,
      routineDayFocus: day.focus,
      completedAt: new Date().toISOString(),
      comments,
      entries: entries.map((entry) => {
        const move = day.exercises.find((item) => item.id === entry.exerciseId)
        return { ...entry, exerciseName: move?.name, muscleGroup: move?.muscleGroup, equipment: move?.equipment }
      }),
    }
    await saveWorkout(log)
    updateWorkspace((current) => ({ ...current, logs: [log, ...current.logs] }))
    setToast({ type: 'success', text: '¡Sesión completada! Tu progreso quedó guardado.' })
  }

  const invite = async (client: Client) => {
    if (!client.email) return
    try {
      await inviteClient(client.id)
      setToast({ type: 'success', text: `Invitación enviada a ${client.email}.` })
    } catch (reason) {
      setToast({ type: 'error', text: reason instanceof Error ? reason.message : 'No se pudo enviar la invitación.' })
    }
  }

  const openAssignForRoutine = (routine: Routine) => {
    if (!data.clients.some((client) => client.status === 'active')) {
      setToast({ type: 'info', text: 'Añade un cliente antes de asignar esta rutina.' })
      return
    }
    setAssignmentModal({ routineId: routine.id })
  }

  const setCurrentView = (next: View) => {
    setView(next)
    setMobileMenuOpen(false)
  }

  if (isSupabaseConfigured && !authReady) return <div className="loading-screen"><div className="loading-brand"><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></div><div className="loading-spinner" /><p>Conectando tu espacio…</p></div>
  if (!user || authLoading) return <LoginView onSignIn={handleSignIn} loading={authLoading} error={authError} configured={isSupabaseConfigured} />
  if (activation) return <ActivateAccount onActivate={async (password) => {
    await setPassword(password)
    const url = new URL(window.location.href)
    url.searchParams.delete('activation')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    setActivation(false)
  }} />
  if (workspaceLoading || loadedUserId !== user.id) return <div className="loading-screen"><div className="loading-brand"><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></div><div className="loading-spinner" /><p>Cargando tu entrenamiento…</p></div>
  if (workspaceError || !profile) return <main className="loading-screen"><div className="workspace-error"><div className="inline-error" role="alert">{workspaceError || 'No se pudo cargar tu perfil.'}</div><Button variant="secondary" onClick={() => window.location.reload()}>Volver a intentar</Button><Button variant="ghost" onClick={() => void handleSignOut()}>Cerrar sesión</Button></div></main>

  const clientMode = currentRole === 'client'
  const visibleNav = clientMode ? [{ id: 'portal' as const, label: 'Mi entrenamiento', icon: Activity }] : navigation
  const title = clientMode ? 'Mi entrenamiento' : navigation.find((item) => item.id === view)?.label ?? 'Inicio'
  const profileName = profile?.fullName || user.email?.split('@')[0] || 'Usuario'
  const getRoutineName = (clientId: string) => {
    const today = new Date().toISOString().slice(0, 10)
    const assigned = data.assignments.filter((item) => item.clientId === clientId && item.active && item.startDate <= today && item.endDate >= today).sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
    return data.routines.find((routine) => routine.id === assigned?.routineId)?.name ?? ''
  }

  return <div className={`app-shell ${clientMode ? 'client-shell' : ''}`}>
    <aside className={`sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <a className="brand brand-logo" href="#" onClick={(event) => { event.preventDefault(); setCurrentView(clientMode ? 'portal' : 'dashboard') }}><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></a>
      <div className="workspace-chip"><span className="workspace-avatar"><Sparkles size={14} /></span><div><strong>Mi espacio</strong><small>{clientMode ? 'Portal personal' : 'Entrenador'}</small></div></div>
      <div className="nav-section-label">{clientMode ? 'TU ESPACIO' : 'GESTIÓN'}</div>
      <nav className="main-nav" aria-label="Navegación principal">{visibleNav.map((item) => {
        const Icon = item.icon
        const active = clientMode ? view === 'portal' : view === item.id
        return <button key={item.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setCurrentView(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === 'clients' && <span className="nav-count">{data.clients.filter((client) => client.status === 'active').length}</span>}{active && <span className="nav-active-mark" />}</button>
      })}</nav>
      {!clientMode && <div className="sidebar-bottom"><div className="coach-card"><div className="coach-illustration"><Dumbbell size={19} /><span>✦</span></div><strong>Tu espacio, tu método.</strong><p>Un paso a la vez. Acompaña a tu comunidad con intención.</p><span className="coach-card-foot">HECHO PARA ENTRENADORES</span></div><div className="sidebar-divider" /></div>}
      <div className="sidebar-profile"><Avatar name={profileName} size="small" /><div className="sidebar-profile-info"><strong>{profileName}</strong><span>{clientMode ? 'Cliente' : 'Entrenador'}</span></div><button className="icon-button sidebar-logout" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={handleSignOut} disabled={signingOut}><LogOut size={16} /></button></div>
    </aside>
    {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} />}
    <div className="main-area">
      <header className="topbar"><div className="topbar-left"><button className="mobile-menu-button icon-button" aria-label="Abrir menú" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button><span className="breadcrumb-root">Espacio</span><span className="breadcrumb-slash">/</span><span className="breadcrumb-current">{title}</span></div><div className="topbar-right">
        <span className="secure-tag"><span /> CONECTADO</span>
        <span className="topbar-divider" /><span className="topbar-avatar" aria-label={profileName}><Avatar name={profileName} size="small" /></span>
      </div></header>
      <main className="content-area">
        {clientMode ? <ClientPortal client={activeClient} assignment={activeAssignment} routine={activeRoutine} logs={data.logs} onComplete={completeWorkout} /> :
          view === 'dashboard' ? <DashboardView clients={data.clients} routines={data.routines} logs={data.logs} onAddClient={() => setClientModal('new')} onAddRoutine={() => setRoutineModal('new')} onManageClients={() => setCurrentView('clients')} /> :
          view === 'clients' ? <ClientsView clients={data.clients} getRoutineName={getRoutineName} onAdd={() => setClientModal('new')} onEdit={(client) => setClientModal(client)} onAssign={(client) => setAssignmentModal({ client })} onInvite={invite} /> :
          view === 'routines' ? <RoutinesView routines={data.routines} onAdd={() => setRoutineModal('new')} onEdit={(routine) => setRoutineModal(routine)} onAssign={openAssignForRoutine} onDuplicate={duplicateRoutine} onArchive={(routine) => void toggleArchive(routine)} /> :
          <ExercisesView exercises={data.exercises} onAdd={() => setExerciseModal('new')} onEdit={(exercise) => setExerciseModal(exercise)} />}
      </main>
    </div>
    {!clientMode && <nav className="mobile-bottom-nav" aria-label="Navegación rápida">{navigation.map((item) => {
      const Icon = item.icon
      return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setCurrentView(item.id)}><Icon size={18} /><span>{item.label}</span></button>
    })}</nav>}
    {clientModal && <ClientFormModal client={clientModal === 'new' ? null : clientModal} onClose={() => setClientModal(null)} onSave={saveClientRecord} />}
    {exerciseModal && <ExerciseFormModal exercise={exerciseModal === 'new' ? null : exerciseModal} onClose={() => setExerciseModal(null)} onSave={saveExerciseRecord} />}
    {routineModal && <RoutineFormModal routine={routineModal === 'new' ? null : routineModal} exercises={data.exercises} onClose={() => setRoutineModal(null)} onSave={saveRoutineRecord} />}
    {assignmentModal && <AssignmentModal client={assignmentModal.client} clients={data.clients} initialRoutineId={assignmentModal.routineId} routines={data.routines} onClose={() => setAssignmentModal(null)} onSave={assignRoutine} />}
    {toast && <div className={`toast toast-${toast.type}`} role="status"><span>{toast.type === 'success' ? <Check size={16} /> : toast.type === 'error' ? <X size={16} /> : <Sparkles size={16} />}</span><p>{toast.text}</p><button aria-label="Cerrar aviso" onClick={() => setToast(null)}><X size={15} /></button></div>}
  </div>
}
