import { useMemo, useState } from 'react'
import { Archive, CalendarDays, Copy, Dumbbell, Edit3, Plus, Search, Sparkles } from 'lucide-react'
import type { Routine } from '../types'
import { Button, EmptyState } from './ui'

export function RoutinesView({
  routines,
  onAdd,
  onEdit,
  onAssign,
  onDuplicate,
  onArchive,
}: {
  routines: Routine[]
  onAdd: () => void
  onEdit: (routine: Routine) => void
  onAssign: (routine: Routine) => void
  onDuplicate: (routine: Routine) => void
  onArchive: (routine: Routine) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'active' | 'archived' | 'all'>('active')
  const filtered = useMemo(() => routines.filter((routine) => {
    const matchesText = `${routine.name} ${routine.goal}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (filter === 'all' || (filter === 'archived' ? routine.archived : !routine.archived))
  }), [filter, query, routines])

  return <div className="page-content">
    <div className="page-heading-row"><div><p className="eyebrow">PLANIFICACIÓN</p><h1>Rutinas <span className="count-pill">{routines.length}</span></h1><p className="page-subtitle">Planes que puedes personalizar, asignar y hacer crecer.</p></div><Button onClick={onAdd}><Plus size={16} /> Crear rutina</Button></div>
    <div className="routine-banner"><div className="banner-sparkle"><Sparkles size={20} /></div><div><strong>Tu método, a tu manera.</strong><p>Empieza con una plantilla y ajústala para cada cliente.</p></div><div className="banner-stat"><strong>{routines.filter((routine) => !routine.archived).length}</strong><span>planes activos</span></div></div>
    <section className="panel routine-library">
      <div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar rutinas..." /></div><div className="filter-tabs">{(['active', 'archived', 'all'] as const).map((value) => <button className={filter === value ? 'selected' : ''} key={value} onClick={() => setFilter(value)}>{value === 'active' ? 'Activas' : value === 'archived' ? 'Archivadas' : 'Todas'}</button>)}</div></div>
      {filtered.length ? <div className="routine-grid">{filtered.map((routine, index) => {
        const colors = ['routine-art-lime', 'routine-art-purple', 'routine-art-blue', 'routine-art-orange']
        const movementCount = routine.days.reduce((total, day) => total + day.exercises.length, 0)
        return <article className={`routine-card ${routine.archived ? 'is-archived' : ''}`} key={routine.id}>
          <div className={`routine-card-art ${colors[index % colors.length]}`}><span className="routine-card-number">{String(index + 1).padStart(2, '0')}</span><span className="routine-dumbbell"><Dumbbell size={39} strokeWidth={1.3} /></span><span className="routine-card-status">{routine.archived ? 'ARCHIVADA' : 'ACTIVA'}</span><button aria-label={`Editar ${routine.name}`} className="routine-edit-float" onClick={() => onEdit(routine)}><Edit3 size={15} /></button></div>
          <div className="routine-card-body"><span className="routine-goal">{routine.goal}</span><h3>{routine.name}</h3><div className="routine-card-meta"><span><CalendarDays size={14} /> {routine.durationWeeks} semanas</span><span><Dumbbell size={14} /> {routine.days.length} días · {movementCount} ejercicios</span></div><div className="routine-card-actions"><Button variant="secondary" onClick={() => onAssign(routine)} disabled={routine.archived}><Plus size={15} /> Asignar</Button><div><button className="icon-button" title="Duplicar rutina" aria-label={`Duplicar ${routine.name}`} onClick={() => onDuplicate(routine)}><Copy size={15} /></button><button className="icon-button" title={routine.archived ? 'Restaurar rutina' : 'Archivar rutina'} aria-label={routine.archived ? 'Restaurar rutina' : 'Archivar rutina'} onClick={() => onArchive(routine)}><Archive size={15} /></button></div></div></div>
        </article>
      })}</div> : <EmptyState icon={<Dumbbell size={21} />} title={query ? 'No encontramos esa rutina' : 'Aún no tienes rutinas'} detail={query ? 'Prueba con otro nombre u objetivo.' : 'Diseña tu primera rutina y empieza a crear planes personalizados.'} action={!query ? <Button onClick={onAdd}><Plus size={16} /> Crear rutina</Button> : undefined} />}
    </section>
  </div>
}
