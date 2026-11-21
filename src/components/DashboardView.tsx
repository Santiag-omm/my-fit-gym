import { Activity, ArrowDownRight, ArrowUpRight, ArrowUpRight as OpenIcon, CalendarDays, Clock3, Dumbbell, Plus, Users, Zap } from 'lucide-react'
import type { Client, Routine, WorkoutLog } from '../types'
import { Avatar, Button, EmptyState } from './ui'

export function DashboardView({
  clients,
  routines,
  logs,
  onAddClient,
  onAddRoutine,
  onManageClients,
}: {
  clients: Client[]
  routines: Routine[]
  logs: WorkoutLog[]
  onAddClient: () => void
  onAddRoutine: () => void
  onManageClients: () => void
}) {
  const activeClients = clients.filter((client) => client.status === 'active')
  const activeRoutines = routines.filter((routine) => !routine.archived)
  const recentLogs = [...logs].sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 5)
  const weekStart = new Date()
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const previousWeekStart = new Date(weekStart)
  previousWeekStart.setDate(previousWeekStart.getDate() - 7)
  const thisWeekLogs = logs.filter((log) => {
    const completedAt = new Date(log.completedAt)
    return completedAt >= weekStart && completedAt < nextWeekStart
  })
  const previousWeek = logs.filter((log) => {
    const completedAt = new Date(log.completedAt)
    return completedAt >= previousWeekStart && completedAt < weekStart
  }).length
  const thisWeek = thisWeekLogs.length
  const trend = previousWeek ? Math.round(((thisWeek - previousWeek) / previousWeek) * 100) : 0

  return (
    <div className="page-content">
      <div className="welcome-row">
        <div><p className="eyebrow">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p><h1>Tu espacio de entrenamiento <span>✦</span></h1><p className="page-subtitle">Un vistazo rápido a lo que está pasando con tu equipo.</p></div>
        <div className="welcome-actions"><Button variant="secondary" onClick={onAddClient}><Plus size={16} /> Añadir cliente</Button><Button onClick={onAddRoutine}><Plus size={16} /> Crear rutina</Button></div>
      </div>
      <section className="metric-grid">
        <article className="metric-card"><div className="metric-top"><span className="metric-icon lime"><Users size={18} /></span><span className="metric-note">en seguimiento</span></div><p className="metric-label">Clientes activos</p><div className="metric-value">{activeClients.length}<span> clientes</span></div><div className="metric-bottom">{clients.length} en total</div></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon purple"><Dumbbell size={18} /></span><span className="metric-note">en curso</span></div><p className="metric-label">Rutinas activas</p><div className="metric-value">{activeRoutines.length}<span> planes</span></div><div className="metric-bottom">De {routines.length} creadas</div></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon blue"><Activity size={18} /></span>{previousWeek ? <span className={`metric-delta ${trend < 0 ? 'negative' : ''}`}>{trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(trend)}%</span> : <span className="metric-note">sin comparativa</span>}</div><p className="metric-label">Sesiones esta semana</p><div className="metric-value">{thisWeek}<span> sesiones</span></div><div className="metric-bottom">vs. semana anterior</div></article>
        <article className="metric-card"><div className="metric-top"><span className="metric-icon orange"><Zap size={18} /></span><span className="metric-note">en el historial</span></div><p className="metric-label">Sesiones registradas</p><div className="metric-value">{logs.length}<span> sesiones</span></div><div className="metric-bottom">De toda tu comunidad</div></article>
      </section>

      <section className="overview-grid">
        <article className="panel activity-panel">
          <div className="panel-heading"><div><h2>Actividad reciente</h2><p>Lo último de tu comunidad</p></div><span className="live-tag"><span /> RECIENTE</span></div>
          {recentLogs.length ? <div className="activity-list">{recentLogs.map((log) => {
            const client = clients.find((item) => item.id === log.clientId)
            const when = new Date(log.completedAt)
            const elapsed = Math.max(0, Math.floor((Date.now() - when.getTime()) / 3600000))
            return <div className="activity-item" key={log.id}><Avatar name={client?.name ?? 'Cliente'} size="small" /><div className="activity-copy"><strong>{client?.name ?? 'Cliente'}</strong><span>completó una sesión de entrenamiento</span></div><span className="activity-time">{elapsed < 1 ? 'Ahora' : elapsed < 24 ? `Hace ${elapsed} h` : when.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span><OpenIcon className="activity-arrow" size={14} /></div>
          })}</div> : <EmptyState icon={<Activity size={20} />} title="Aún no hay actividad" detail="Cuando tus clientes registren una sesión, aparecerá aquí." />}</article>
        <article className="panel schedule-panel">
          <div className="panel-heading"><div><h2>Esta semana</h2><p>Ritmo de tu equipo</p></div><span className="schedule-icon"><CalendarDays size={17} /></span></div>
          <div className="week-visual">{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, index) => {
            const counts = thisWeekLogs.filter((log) => new Date(log.completedAt).getDay() === (index + 1) % 7).length
            return <div className="week-day" key={day}><span>{day}</span><div className="week-bar-track"><i style={{ height: `${Math.min(100, 18 + counts * 25)}%` }} /></div><small>{counts || '—'}</small></div>
          })}</div>
          <div className="week-summary"><span><span className="legend-dot" /> Sesiones registradas</span><strong>{thisWeek} <small>esta semana</small></strong></div>
        </article>
      </section>
      <section className="panel clients-panel">
        <div className="panel-heading"><div><h2>Clientes activos</h2><p>Personas que entrenan contigo</p></div><button className="text-link" onClick={onManageClients}>Ver y gestionar <OpenIcon size={14} /></button></div>
        {activeClients.length ? <div className="dashboard-clients">{activeClients.slice(0, 4).map((client) => {
          const current = logs.filter((log) => log.clientId === client.id).length
          return <div className="dashboard-client" key={client.id}><Avatar name={client.name} /><div className="dashboard-client-info"><strong>{client.name}</strong><span>{client.goal}</span></div><span className="client-level">{client.level}</span><div className="client-sessions"><Clock3 size={14} /> {current} sesiones</div><button aria-label={`Ver lista de clientes, ${client.name}`} className="row-arrow" onClick={onManageClients}><OpenIcon size={15} /></button></div>
        })}</div> : <EmptyState icon={<Users size={21} />} title="Empieza con tu primer cliente" detail="Añade a una persona para asignarle un plan de entrenamiento." action={<Button onClick={onAddClient}><Plus size={16} /> Añadir cliente</Button>} />}</section>
      <div className="dashboard-footnote"><span>✦</span> Un buen plan se adapta a la persona, no al revés.</div>
    </div>
  )
}
