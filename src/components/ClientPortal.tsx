import { useMemo, useState } from 'react'
import { Activity, ArrowRight, Check, CheckCircle2, ChevronRight, Clock3, Dumbbell, ExternalLink, Flame, Play, Sparkles, Target } from 'lucide-react'
import type { Assignment, Client, Routine, WorkoutEntry, WorkoutLog } from '../types'
import { Avatar, Button, EmptyState } from './ui'
import { WorkoutModal } from './WorkoutModal'
import { safeHttpUrl } from '../lib/url'
import { safeMediaUrl } from '../lib/exerciseMedia'

export function ClientPortal({
  client,
  assignment,
  routine,
  logs,
  onComplete,
}: {
  client: Client | undefined
  assignment: Assignment | undefined
  routine: Routine | undefined
  logs: WorkoutLog[]
  onComplete: (dayId: string, comments: string, entries: WorkoutEntry[]) => Promise<void>
}) {
  const [selectedDayId, setSelectedDayId] = useState('')
  const [showWorkout, setShowWorkout] = useState(false)
  const [error, setError] = useState('')
  const days = routine?.days ?? []
  const selectedDay = days.find((day) => day.id === selectedDayId) ?? days[0]
  const clientLogs = useMemo(() => [...logs].filter((log) => !client || log.clientId === client.id).sort((a, b) => b.completedAt.localeCompare(a.completedAt)), [client, logs])
  const routineLogs = clientLogs.filter((log) => log.assignmentId === assignment?.id)
  const completionRate = days.length ? Math.min(100, Math.round((routineLogs.length / Math.max(days.length * 2, 1)) * 100)) : 0
  const weekData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    const count = clientLogs.filter((log) => new Date(log.completedAt).toDateString() === date.toDateString()).length
    return { day: date.toLocaleDateString('es-ES', { weekday: 'narrow' }), count, today: index === 6 }
  })

  const complete = async (comments: string, entries: WorkoutEntry[]) => {
    if (!selectedDay) return
    setError('')
    try {
      await onComplete(selectedDay.id, comments, entries)
      setShowWorkout(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar tu entrenamiento.')
      throw reason
    }
  }

  if (!client) return <div className="client-portal-empty"><EmptyState icon={<Avatar name="AT" />} title="Tu portal está listo" detail="Cuando tu entrenador vincule tu cuenta a un perfil de cliente, verás tu rutina aquí." /></div>
  const membershipLabels = { active: 'Activa', pending: 'Pendiente', expired: 'Vencida', suspended: 'Suspendida' }
  if (client.membershipStatus !== 'active') return <div className="panel membership-notice">
    <h1>Hola, {client.name.split(' ')[0]}</h1>
    <p>Estado de tu membresía: <strong>{membershipLabels[client.membershipStatus] ?? 'No disponible'}</strong></p>
    <p>Las rutinas y los registros están disponibles cuando tu membresía está activa. Contacta con el administrador para más información.</p>
  </div>

  return <div className="client-portal">
    <div className="client-hello"><div><p className="eyebrow">TU ESPACIO · {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}</p><h1>Hola, {client.name.split(' ')[0]} <span>✦</span></h1><p className="page-subtitle">Cada sesión te acerca un poco más a tu objetivo.</p></div><div className="hello-avatar"><Avatar name={client.name} /><span><i /> {client.membership === 'premium_plus' ? 'PREMIUM PLUS' : client.membership === 'premium' ? 'PREMIUM' : 'BÁSICA'} · ACTIVA</span></div></div>
    <section className="client-motivation"><div className="motivation-copy"><span className="motivation-kicker"><Sparkles size={14} /> TU ENFOQUE</span><h2>{client.goal || 'Tu progreso, a tu ritmo.'}</h2><p>{routine ? `${routine.name} · ${routine.durationWeeks} semanas` : 'Constancia antes que perfección. Vamos paso a paso.'}</p><div className="motivation-progress"><span>Progreso del plan</span><div className="progress-track"><i style={{ width: `${completionRate}%` }} /></div><strong>{completionRate}%</strong></div></div><div className="motivation-stats"><div><span className="stat-icon"><Flame size={17} /></span><strong>{routineLogs.length}</strong><small>sesiones del plan</small></div><span className="motivation-divider" /><div><span className="stat-icon"><Target size={17} /></span><strong>{days.length}</strong><small>días por ciclo</small></div></div><span className="motivation-decoration">✳</span></section>
    <section className="portal-content-grid">
      <div className="portal-routine-column"><div className="portal-section-heading"><div><h2>Tu rutina</h2><p>Elige tu entrenamiento y ponte en marcha.</p></div>{routine && <span className="routine-cycle">{routine.durationWeeks} SEMANAS</span>}</div>
        {routine && assignment ? <>
          <div className="day-selector">{days.map((day) => {
            const completed = routineLogs.some((log) => log.routineDayId === day.id)
            const selected = (selectedDay?.id ?? '') === day.id
            return <button className={`day-selector-item ${selected ? 'selected' : ''} ${completed ? 'completed' : ''}`} key={day.id} onClick={() => setSelectedDayId(day.id)}><span className="day-selector-top"><span>{String(day.number).padStart(2, '0')}</span>{completed && <Check size={14} />}</span><strong>{day.title}</strong><small>{day.focus || `${day.exercises.length} ejercicios`}</small></button>
          })}</div>
          {selectedDay ? <article className="selected-workout-card"><div className="selected-workout-heading"><div><span className="session-kicker"><span /> SESIÓN {String(selectedDay.number).padStart(2, '0')}</span><h3>{selectedDay.focus || selectedDay.title}</h3><p><Dumbbell size={14} /> {selectedDay.exercises.length} ejercicios <span>·</span><Clock3 size={14} /> {Math.round(selectedDay.exercises.reduce((total, move) => total + move.sets * 2 + move.restSeconds * move.sets / 60, 0))} min aprox.</p></div><span className="workout-day-mark">{String(selectedDay.number).padStart(2, '0')}</span></div>
            <div className="portal-exercise-list">{selectedDay.exercises.map((move, index) => <div className="portal-exercise" key={move.id}>{safeMediaUrl(move.mediaUrl) && <img className="portal-exercise-media" src={safeMediaUrl(move.mediaUrl)} alt={`Demostración de ${move.name}`} />}<span className="exercise-index">{String(index + 1).padStart(2, '0')}</span><div className="portal-exercise-name"><strong>{move.name}</strong><span>{move.muscleGroup}{move.equipment ? ` · ${move.equipment}` : ''}</span><span className="portal-instruction">{move.instructions}</span>{safeHttpUrl(move.videoUrl) && <a className="portal-video-link" href={safeHttpUrl(move.videoUrl)} target="_blank" rel="noreferrer">Ver demostración <ExternalLink size={12} /></a>}</div><div className="exercise-prescription"><strong>{move.sets} <small>×</small> {move.reps}</strong><span>{move.suggestedLoad || 'A elección'} · {move.restSeconds}s</span><span>Tempo {move.tempo || 'libre'}</span></div><ChevronRight size={16} className="exercise-chevron" /></div>)}</div>
            <Button className="start-workout-button" onClick={() => setShowWorkout(true)}><Play size={16} fill="currentColor" /> Registrar entrenamiento <ArrowRight size={16} /></Button>
          </article> : null}
        </> : <div className="panel portal-no-routine"><EmptyState icon={<Dumbbell size={20} />} title="Todavía no tienes una rutina" detail="Tu entrenador te asignará un plan personalizado. Mientras tanto, puedes hablar con él para definir tus objetivos." /></div>}
      </div>
      <aside className="portal-side-column">
        <article className="panel progress-panel"><div className="panel-heading"><div><h2>Tu constancia</h2><p>Últimos 7 días</p></div><Activity size={17} className="panel-heading-icon" /></div><div className="portal-week-chart">{weekData.map((item, index) => <div className="portal-week-day" key={`${item.day}-${index}`}><div className="portal-bar-track"><i className={item.count ? 'has-activity' : ''} style={{ height: item.count ? '100%' : '12%' }} /></div><span className={item.today ? 'today' : ''}>{item.day}</span></div>)}</div><div className="chart-caption"><span><i /> Sesiones registradas</span><strong>{clientLogs.length} <small>en total</small></strong></div></article>
        <article className="panel history-panel"><div className="panel-heading"><div><h2>Historial</h2><p>Tus entrenamientos recientes</p></div><span className="history-count">{clientLogs.length}</span></div>{clientLogs.length ? <div className="history-list">{clientLogs.slice(0, 5).map((log) => {
          const logDay = routine?.days.find((day) => day.id === log.routineDayId)
          return <div className="history-item" key={log.id}><span className="history-check"><CheckCircle2 size={16} /></span><div><strong>{log.routineDayFocus || logDay?.focus || log.routineDayTitle || logDay?.title || 'Sesión completada'}</strong><span>{new Date(log.completedAt).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {log.entries.length} ejercicios registrados</span></div><ChevronRight size={15} /></div>
        })}</div> : <div className="history-empty"><p>Aquí aparecerá tu historial cuando completes tu primera sesión.</p></div>}</article>
        {client.notes && <article className="coach-note"><span><Sparkles size={15} /></span><div><strong>Una nota para ti</strong><p>{client.notes}</p></div></article>}
      </aside>
    </section>
    <a className="media-credit" href="https://repdb.co" target="_blank" rel="noreferrer">Exercise data by RepDB (repdb.co)</a>
    {error && <div className="portal-error" role="alert">{error}</div>}
    {showWorkout && selectedDay && <WorkoutModal day={selectedDay} onClose={() => setShowWorkout(false)} onSave={complete} />}
  </div>
}
