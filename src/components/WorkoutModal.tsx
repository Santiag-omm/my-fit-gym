import { useState } from 'react'
import { CheckCircle2, Clock3, Dumbbell, Timer } from 'lucide-react'
import type { RoutineDay, WorkoutEntry } from '../types'
import { Field, FormActions, Modal } from './ui'

export function WorkoutModal({
  day,
  onClose,
  onSave,
}: {
  day: RoutineDay
  onClose: () => void
  onSave: (comments: string, entries: WorkoutEntry[]) => Promise<void>
}) {
  const [entries, setEntries] = useState<WorkoutEntry[]>(day.exercises.map((move) => ({
    exerciseId: move.id,
    weight: move.suggestedLoad.match(/\d+(?:[.,]\d+)?/)?.[0] ?? '',
    reps: move.reps.match(/\d+/)?.[0] ?? '',
  })))
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const updateEntry = (index: number, patch: Partial<WorkoutEntry>) => setEntries((current) => current.map((entry, currentIndex) => currentIndex === index ? { ...entry, ...patch } : entry))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const invalidEntry = entries.find((entry) => {
      const weight = entry.weight.trim().replace(',', '.')
      const reps = entry.reps.trim()
      return (weight !== '' && (!Number.isFinite(Number(weight)) || Number(weight) < 0))
        || !/^\d+$/.test(reps)
        || Number(reps) < 1
    })
    if (invalidEntry) {
      setError('Revisa los datos: el peso debe ser un número no negativo y las repeticiones un entero mayor que cero.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const normalizedEntries = entries.map((entry) => ({
        ...entry,
        weight: entry.weight.trim().replace(',', '.'),
        reps: entry.reps.trim(),
      }))
      await onSave(comments, normalizedEntries)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la sesión.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title="Registrar entrenamiento" description={`${day.title} · ${day.focus || 'Tu entrenamiento de hoy'}`} onClose={onClose} wide>
    <form className="workout-form" onSubmit={submit}>
      <div className="workout-welcome"><span><CheckCircle2 size={18} /></span><div><strong>Ya hiciste lo más difícil: empezar.</strong><p>Registra cómo te fue en cada ejercicio.</p></div></div>
      <div className="workout-exercises">{day.exercises.map((move, index) => <article className="workout-exercise" key={move.id}>
        <div className="workout-exercise-head"><span className="workout-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{move.name}</strong><span>{move.sets} series · {move.reps} reps</span></div><span className="workout-muscle">{move.muscleGroup}</span></div>
        <div className="workout-exercise-note"><span><Dumbbell size={13} /> {move.equipment || 'Peso corporal'}</span><span><Dumbbell size={13} /> Sugerido: {move.suggestedLoad || 'A elección'}</span><span><Timer size={13} /> Descansa {move.restSeconds} s</span><span><Clock3 size={13} /> Tempo {move.tempo || 'libre'}</span></div>
        <div className="workout-inputs"><Field label="Peso utilizado (kg)"><input inputMode="decimal" aria-label={`Peso utilizado para ${move.name}`} value={entries[index].weight} onChange={(event) => updateEntry(index, { weight: event.target.value })} placeholder="Ej. 20 (opcional)" /></Field><Field label="Repeticiones realizadas"><input inputMode="numeric" aria-label={`Repeticiones realizadas para ${move.name}`} required value={entries[index].reps} onChange={(event) => updateEntry(index, { reps: event.target.value })} placeholder="Ej. 10" /></Field></div>
      </article>)}</div>
      <Field label="¿Cómo te sentiste?"><textarea rows={2} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Una nota para ti o para tu entrenador..." /></Field>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <FormActions onCancel={onClose} submitText={saving ? 'Registrando…' : 'Completar entrenamiento'} />
    </form>
  </Modal>
}
