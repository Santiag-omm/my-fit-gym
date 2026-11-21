import type { FormEvent, ReactNode } from 'react'
import { X } from 'lucide-react'

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

export function Modal({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Cerrar" onClick={onClose}><X size={19} /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function Avatar({ name, size = 'normal' }: { name: string; size?: 'normal' | 'small' }) {
  const initials = name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
  return <span className={`avatar avatar-${size}`}>{initials || 'AF'}</span>
}

export function EmptyState({ icon, title, detail, action }: { icon: ReactNode; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{detail}</p>
      {action}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return <label className="field"><span className="field-label">{label}</span>{children}{hint && <span className="field-hint">{hint}</span>}</label>
}

export function FormActions({ onCancel, submitText = 'Guardar', disabled = false }: { onCancel: () => void; submitText?: string; disabled?: boolean }) {
  return <div className="form-actions"><Button type="button" variant="ghost" onClick={onCancel} disabled={disabled}>Cancelar</Button><Button type="submit" disabled={disabled}>{submitText}</Button></div>
}

export function stopSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault()
}
