import { useState } from 'react'
import { Button, Field } from './ui'

export function ActivateAccount({ onActivate }: { onActivate: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirmation) { setError('Las contraseñas no coinciden.'); return }
    if (password.length < 12) { setError('La contraseña debe tener al menos 12 caracteres.'); return }
    setSaving(true)
    setError('')
    try { await onActivate(password) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo establecer la contraseña.') }
    finally { setSaving(false) }
  }
  return <main className="loading-screen"><section className="panel activation-panel">
    <div className="brand brand-logo"><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></div>
    <h1>Activa tu cuenta</h1><p>Elige una contraseña segura y única para tu cuenta.</p>
    <form className="stack-form" onSubmit={submit}>
      <Field label="Nueva contraseña"><input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <Field label="Confirmar contraseña"><input type="password" autoComplete="new-password" minLength={12} required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></Field>
      {error && <div className="inline-error" role="alert">{error}</div>}
      <Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Activar cuenta'}</Button>
    </form>
  </section></main>
}
