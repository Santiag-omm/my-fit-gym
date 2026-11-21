import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { makeId } from '../lib/id'
import type { Exercise, Routine, RoutineDay, RoutineExercise } from '../types'
import { Button, Field, FormActions, Modal } from './ui'

export function RoutineFormModal({
  routine,
  exercises,
  onClose,
  onSave,
}: {
  routine: Routine | null
  exercises: Exercise[]
  onClose: () => void
  onSave: (value: Routine) => Promise<void>
}) {
  const [form, setForm] = useState<Routine>(routine ? structuredClone(routine) : {
    id: '',
    name: '',
    goal: 'Fuerza y técnica',
    durationWeeks: 6,
    archived: false,
    days: [{ id: makeId('day'), number: 1, title: 'Día 1', focus: '', exercises: [] }],
  })
  const [selectedExercises, setSelectedExercises] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateDay = (dayId: string, patch: Partial<RoutineDay>) => setForm((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, ...patch } : day) }))
  const updateMove = (dayId: string, moveId: string, patch: Partial<RoutineExercise>) => setForm((current) => ({
    ...current,
    days: current.days.map((day) => day.id === dayId ? { ...day, exercises: day.exercises.map((move) => move.id === moveId ? { ...move, ...patch } : move) } : day),
  }))
  const addDay = () => setForm((current) => {
    const number = current.days.length + 1
    return { ...current, days: [...current.days, { id: makeId('day'), number, title: `Día ${number}`, focus: '', exercises: [] }] }
  })
  const addExercise = (dayId: string) => {
    const selected = exercises.find((exercise) => exercise.id === selectedExercises[dayId])
    if (!selected) return
    const move: RoutineExercise = {
      id: makeId('move'),
      exerciseId: selected.id,
      name: selected.name,
      muscleGroup: selected.muscleGroup,
      equipment: selected.equipment,
      instructions: selected.instructions,
      videoUrl: selected.videoUrl,
      mediaUrl: selected.mediaUrl,
      sets: 3,
      reps: '8–10',
      restSeconds: 60,
      tempo: '2-0-2',
      suggestedLoad: '',
    }
    setForm((current) => ({ ...current, days: current.days.map((day) => day.id === dayId ? { ...day, exercises: [...day.exercises, move] } : day) }))
  }
  const deleteDay = (dayId: string) => setForm((current) => ({ ...current, days: current.days.filter((day) => day.id !== dayId).map((day, index) => ({ ...day, number: index + 1 })) }))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.days.length || form.days.some((day) => !day.exercises.length)) {
      setError('Agrega al menos un día de entrenamiento y un ejercicio por día.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar la rutina.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title={routine ? 'Editar rutina' : 'Crear rutina'} description="Diseña un plan de entrenamiento que se adapte a la persona." onClose={onClose} wide>
    <form className="routine-form" onSubmit={submit}>
      <div className="form-grid routine-basics">
        <Field label="Nombre de la rutina"><input required minLength={3} autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Fuerza · Base 3 días" /></Field>
        <Field label="Objetivo"><input required value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} placeholder="Ej. Ganar fuerza" /></Field>
        <Field label="Duración (semanas)"><input type="number" min={1} max={52} required value={form.durationWeeks} onChange={(event) => setForm({ ...form, durationWeeks: Number(event.target.value) })} /></Field>
      </div>
      <div className="editor-section-heading"><div><h3>Días de entrenamiento</h3><p>Organiza ejercicios y define los detalles de cada sesión.</p></div><Button type="button" variant="secondary" onClick={addDay}><Plus size={15} /> Añadir día</Button></div>
      <div className="routine-days-editor">
        {form.days.map((day) => <section className="day-editor" key={day.id}>
          <div className="day-editor-heading"><span className="day-number">{String(day.number).padStart(2, '0')}</span><div className="day-heading-fields"><input aria-label="Nombre del día" value={day.title} onChange={(event) => updateDay(day.id, { title: event.target.value })} /><input aria-label="Enfoque del día" value={day.focus} onChange={(event) => updateDay(day.id, { focus: event.target.value })} placeholder="Enfoque del entrenamiento" /></div><button type="button" className="icon-button danger-icon" aria-label="Eliminar día" onClick={() => deleteDay(day.id)} disabled={form.days.length === 1}><Trash2 size={16} /></button></div>
          {day.exercises.length ? <div className="routine-move-list">{day.exercises.map((move, index) => <div className="routine-move-editor" key={move.id}>
            <div className="move-editor-title"><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{move.name}</strong><small>{move.muscleGroup}</small></div><button type="button" className="icon-button danger-icon" aria-label={`Eliminar ${move.name}`} onClick={() => updateDay(day.id, { exercises: day.exercises.filter((item) => item.id !== move.id) })}><Trash2 size={15} /></button></div>
            <div className="move-settings-grid">
              <Field label="Series"><input type="number" min={1} max={20} required value={move.sets} onChange={(event) => updateMove(day.id, move.id, { sets: Number(event.target.value) })} /></Field>
              <Field label="Repeticiones"><input required value={move.reps} onChange={(event) => updateMove(day.id, move.id, { reps: event.target.value })} placeholder="8–10" /></Field>
              <Field label="Descanso (s)"><input type="number" min={0} required value={move.restSeconds} onChange={(event) => updateMove(day.id, move.id, { restSeconds: Number(event.target.value) })} /></Field>
              <Field label="Tempo"><input value={move.tempo} onChange={(event) => updateMove(day.id, move.id, { tempo: event.target.value })} placeholder="2-0-2" /></Field>
              <Field label="Carga sugerida"><input value={move.suggestedLoad} onChange={(event) => updateMove(day.id, move.id, { suggestedLoad: event.target.value })} placeholder="A elección" /></Field>
            </div>
          </div>)}</div> : <p className="day-empty-note">Agrega ejercicios para construir este día.</p>}
          {exercises.length ? <div className="add-exercise-row"><select aria-label="Seleccionar ejercicio" value={selectedExercises[day.id] ?? ''} onChange={(event) => setSelectedExercises({ ...selectedExercises, [day.id]: event.target.value })}><option value="">Elige un ejercicio del catálogo</option>{exercises.map((exercise) => <option value={exercise.id} key={exercise.id}>{exercise.name} · {exercise.muscleGroup}</option>)}</select><Button type="button" variant="secondary" onClick={() => addExercise(day.id)} disabled={!selectedExercises[day.id]}><Plus size={15} /> Añadir ejercicio</Button></div> : <p className="day-empty-note">Crea ejercicios en el catálogo para agregarlos a la rutina.</p>}
        </section>)}
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <FormActions onCancel={onClose} submitText={saving ? 'Guardando…' : routine ? 'Guardar cambios' : 'Crear rutina'} />
    </form>
  </Modal>
}
