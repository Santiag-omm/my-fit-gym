import { useMemo, useState } from 'react'
import { Dumbbell, ExternalLink, Plus, Search, Wrench } from 'lucide-react'
import type { Exercise } from '../types'
import { safeHttpUrl } from '../lib/url'
import { safeMediaUrl } from '../lib/exerciseMedia'
import { Button, EmptyState } from './ui'

export function ExercisesView({
  exercises,
  onAdd,
  onEdit,
}: {
  exercises: Exercise[]
  onAdd: () => void
  onEdit: (exercise: Exercise) => void
}) {
  const [query, setQuery] = useState('')
  const [muscle, setMuscle] = useState('Todos')
  const muscles = ['Todos', ...new Set(exercises.map((exercise) => exercise.muscleGroup).sort())]
  const filtered = useMemo(() => exercises.filter((exercise) => {
    const matchesText = `${exercise.name} ${exercise.muscleGroup} ${exercise.equipment}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (muscle === 'Todos' || exercise.muscleGroup === muscle)
  }), [exercises, muscle, query])

  return <div className="page-content">
    <div className="page-heading-row"><div><p className="eyebrow">TU BIBLIOTECA</p><h1>Ejercicios <span className="count-pill">{exercises.length}</span></h1><p className="page-subtitle">Un catálogo propio para diseñar entrenamientos con detalle.</p></div><Button onClick={onAdd}><Plus size={16} /> Añadir ejercicio</Button></div>
    <div className="catalog-summary"><div className="catalog-summary-icon"><Dumbbell size={20} /></div><div><strong>{exercises.length} ejercicios en tu catálogo</strong><p>Los nuevos ejercicios estarán disponibles al editar una rutina.</p></div><div className="catalog-muscle-count">{Math.max(0, muscles.length - 1)}<span>grupos musculares</span></div></div>
    <section className="panel exercise-library">
      <div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicios o equipo..." /></div><div className="muscle-select"><Wrench size={15} /><select aria-label="Filtrar por grupo muscular" value={muscle} onChange={(event) => setMuscle(event.target.value)}>{muscles.map((value) => <option key={value}>{value}</option>)}</select></div></div>
      {filtered.length ? <div className="exercise-grid">{filtered.map((exercise, index) => <article className={`exercise-card exercise-tone-${index % 4}`} key={exercise.id}>
        <div className="exercise-card-top"><span className="exercise-muscle-tag">{exercise.muscleGroup}</span><button aria-label={`Editar ${exercise.name}`} title="Editar ejercicio" className="icon-button" onClick={() => onEdit(exercise)}>•••</button></div>
        {safeMediaUrl(exercise.mediaUrl) ? <img className="exercise-media" src={safeMediaUrl(exercise.mediaUrl)} alt={`Demostración de ${exercise.name}`} /> : <div className="exercise-icon"><Dumbbell size={22} strokeWidth={1.6} /></div>}
        <h3>{exercise.name}</h3>
        <p className="exercise-equipment">{exercise.equipment || 'Sin equipo específico'}</p>
        <p className="exercise-instructions">{exercise.instructions}</p>
        <div className="exercise-card-foot"><span>GUÍA TÉCNICA</span>{safeHttpUrl(exercise.videoUrl) ? <a href={safeHttpUrl(exercise.videoUrl)} target="_blank" rel="noreferrer">Ver video <ExternalLink size={13} /></a> : <span className="no-video">Sin video</span>}</div>
      </article>)}</div> : <EmptyState icon={<Dumbbell size={21} />} title={query || muscle !== 'Todos' ? 'No encontramos ejercicios' : 'Tu catálogo empieza aquí'} detail={query || muscle !== 'Todos' ? 'Prueba con otros términos o grupos musculares.' : 'Añade instrucciones útiles para que cada entrenamiento sea más claro.'} action={!query && muscle === 'Todos' ? <Button onClick={onAdd}><Plus size={16} /> Añadir ejercicio</Button> : undefined} />}
    </section>
    <a className="media-credit" href="https://repdb.co" target="_blank" rel="noreferrer">Exercise data by RepDB (repdb.co)</a>
  </div>
}
