import { useState } from 'react'
import type { Exercise } from '../types'
import { Field, FormActions, Modal } from './ui'
import { exerciseImages, safeMediaUrl } from '../lib/exerciseMedia'
import { safeHttpUrl } from '../lib/url'

export function ExerciseFormModal({
  exercise,
  onClose,
  onSave,
}: {
  exercise: Exercise | null
  onClose: () => void
  onSave: (value: Exercise) => Promise<void>
}) {
  const [form, setForm] = useState<Exercise>(exercise ?? { id: '', name: '', muscleGroup: 'Pecho', equipment: '', instructions: '', videoUrl: '', mediaUrl: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if ((form.videoUrl && !safeHttpUrl(form.videoUrl)) || (form.mediaUrl && !safeMediaUrl(form.mediaUrl))) {
      setError('Usa un enlace http/https válido o elige una ilustración de la biblioteca.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el ejercicio.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title={exercise ? 'Editar ejercicio' : 'Añadir ejercicio'} description="Tu catálogo personal para crear rutinas más rápido." onClose={onClose}>
    <form className="stack-form modal-form" onSubmit={submit}>
      <Field label="Nombre del ejercicio"><input autoFocus required minLength={2} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej. Press de banca" /></Field>
      <div className="form-grid">
        <Field label="Grupo muscular"><select value={form.muscleGroup} onChange={(event) => setForm({ ...form, muscleGroup: event.target.value })}>{['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Isquiotibiales', 'Glúteos', 'Core', 'Pantorrillas', 'Cuerpo completo', 'Movilidad'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Equipo necesario"><input value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} placeholder="Barra, mancuernas…" /></Field>
      </div>
      <Field label="Instrucciones"><textarea required rows={4} value={form.instructions} onChange={(event) => setForm({ ...form, instructions: event.target.value })} placeholder="Describe la técnica y los puntos importantes." /></Field>
      <Field label="Enlace a video (opcional)"><input type="url" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://…" /></Field>
      <Field label="Ilustración de la biblioteca"><select value={exerciseImages.some((item) => item.path === form.mediaUrl) ? form.mediaUrl : ''} onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })}><option value="">Seleccionar ilustración</option>{exerciseImages.map((item) => <option key={item.path} value={item.path}>{item.name}</option>)}</select></Field>
      <Field label="Imagen o GIF (enlace opcional)"><input type="text" value={form.mediaUrl} onChange={(event) => setForm({ ...form, mediaUrl: event.target.value })} placeholder="https://…/ejercicio.gif" /></Field>
      <a className="media-credit" href="https://repdb.co" target="_blank" rel="noreferrer">Exercise data by RepDB (repdb.co)</a>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <FormActions onCancel={onClose} submitText={saving ? 'Guardando…' : exercise ? 'Guardar cambios' : 'Añadir ejercicio'} />
    </form>
  </Modal>
}
