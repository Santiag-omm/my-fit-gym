import { useState } from 'react'
import type { Client } from '../types'
import { Button, Field, FormActions, Modal } from './ui'

export function ClientFormModal({
  client,
  onClose,
  onSave,
}: {
  client: Client | null
  onClose: () => void
  onSave: (value: Client) => Promise<void>
}) {
  const [form, setForm] = useState<Client>(client ?? {
    id: '',
    name: '',
    email: '',
    phone: '',
    goal: 'Ganar fuerza',
    level: 'Principiante',
    startDate: new Date().toISOString().slice(0, 10),
    notes: '',
    status: 'active',
    membership: 'premium',
    membershipStatus: 'pending',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const update = (key: keyof Client, value: string) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el cliente.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title={client ? 'Editar cliente' : 'Añadir cliente'} description="Conoce a la persona para crear un plan que le funcione." onClose={onClose}>
    <form className="stack-form modal-form" onSubmit={submit}>
      <Field label="Nombre completo"><input required minLength={2} autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Ej. Alex García" /></Field>
      <div className="form-grid">
        <Field label="Correo electrónico"><input type="email" required value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="alex@correo.com" /></Field>
        <Field label="Teléfono"><input type="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+34 600 000 000" /></Field>
      </div>
      <div className="form-grid">
        <Field label="Objetivo"><select value={form.goal} onChange={(event) => update('goal', event.target.value)}>{['Ganar fuerza', 'Hipertrofia', 'Pérdida de grasa', 'Mejorar resistencia', 'Salud y bienestar', 'Movilidad'].map((value) => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Nivel"><select value={form.level} onChange={(event) => update('level', event.target.value)}>{['Principiante', 'Intermedio', 'Avanzado'].map((value) => <option key={value}>{value}</option>)}</select></Field>
      </div>
      <div className="form-grid">
        <Field label="Fecha de inicio"><input type="date" required value={form.startDate} onChange={(event) => update('startDate', event.target.value)} /></Field>
        {client && <Field label="Estado"><select value={form.status} onChange={(event) => update('status', event.target.value as Client['status'])}><option value="active">Activo</option><option value="inactive">En pausa</option></select></Field>}
      </div>
      <Field label="Mensualidad"><select value={form.membership} onChange={(event) => update('membership', event.target.value)}><option value="basica">Básica · visitante</option><option value="premium">Premium · acceso semanal</option><option value="premium_plus">Premium Plus · mensual con coach</option></select></Field>
      <Field label="Estado de la membresía"><select value={form.membershipStatus} onChange={(event) => update('membershipStatus', event.target.value)}><option value="pending">Pendiente</option><option value="active">Activa</option><option value="expired">Vencida</option><option value="suspended">Suspendida</option></select></Field>
      {!client && <p className="field-hint">Se enviará una invitación a este correo para que el cliente cree su contraseña.</p>}
      <Field label="Notas para ti"><textarea rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Lesiones, preferencias, contexto..." /></Field>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <FormActions onCancel={onClose} disabled={saving} submitText={saving ? 'Guardando…' : client ? 'Guardar cambios' : 'Añadir cliente'} />
    </form>
  </Modal>
}

export function AssignmentModal({
  client,
  clients = [],
  initialRoutineId = '',
  routines,
  onClose,
  onSave,
}: {
  client?: Client
  clients?: Client[]
  initialRoutineId?: string
  routines: { id: string; name: string; durationWeeks: number; archived: boolean }[]
  onClose: () => void
  onSave: (clientId: string, routineId: string, startDate: string, endDate: string) => Promise<void>
}) {
  const availableRoutines = routines.filter((routine) => !routine.archived)
  const [clientId, setClientId] = useState(client?.id ?? clients.find((item) => item.status === 'active')?.id ?? '')
  const [routineId, setRoutineId] = useState(initialRoutineId || availableRoutines[0]?.id || '')
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selected = availableRoutines.find((routine) => routine.id === routineId)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selected || !clientId || !endDate || endDate < startDate) {
      setError('Elige una rutina y una fecha final posterior al inicio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave(clientId, routineId, startDate, endDate)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo asignar la rutina.')
    } finally {
      setSaving(false)
    }
  }

  return <Modal title="Asignar una rutina" description={`Crea el plan de entrenamiento${client ? ` de ${client.name}` : ' para un cliente'}.`} onClose={onClose}>
    {availableRoutines.length && (client || clients.some((item) => item.status === 'active')) ? <form className="stack-form modal-form" onSubmit={submit}>
      {!client && <Field label="Cliente"><select required value={clientId} onChange={(event) => setClientId(event.target.value)}>{clients.filter((item) => item.status === 'active').map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>}
      <Field label="Rutina"><select required value={routineId} onChange={(event) => setRoutineId(event.target.value)}>{availableRoutines.map((routine) => <option value={routine.id} key={routine.id}>{routine.name} · {routine.durationWeeks} semanas</option>)}</select></Field>
      <div className="form-grid">
        <Field label="Fecha de inicio"><input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
        <Field label="Fecha de finalización"><input type="date" required min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
      </div>
      <div className="assignment-note"><span>✦</span> Al asignar un nuevo plan, el anterior quedará en el historial.</div>
      {error && <div className="inline-error">{error}</div>}
      <FormActions onCancel={onClose} submitText={saving ? 'Asignando…' : 'Asignar rutina'} />
    </form> : <div className="empty-state compact-empty"><h3>No hay rutinas disponibles</h3><p>Crea una rutina antes de asignarla a un cliente.</p><Button variant="ghost" onClick={onClose}>Entendido</Button></div>}
  </Modal>
}
