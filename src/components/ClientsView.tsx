import { useMemo, useState } from 'react'
import { AtSign, ClipboardList, MoreHorizontal, Plus, Search, UserRound, UserRoundPlus, Users } from 'lucide-react'
import type { Client } from '../types'
import { Avatar, Button, EmptyState } from './ui'

export function ClientsView({
  clients,
  getRoutineName,
  onAdd,
  onEdit,
  onAssign,
  onInvite,
}: {
  clients: Client[]
  getRoutineName: (clientId: string) => string
  onAdd: () => void
  onEdit: (client: Client) => void
  onAssign: (client: Client) => void
  onInvite: (client: Client) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const filtered = useMemo(() => clients.filter((client) => {
    const matchesText = `${client.name} ${client.email} ${client.goal}`.toLowerCase().includes(query.toLowerCase())
    return matchesText && (filter === 'all' || client.status === filter)
  }), [clients, filter, query])
  const activeCount = clients.filter((client) => client.status === 'active').length
  const membershipLabels = { active: 'Activa', pending: 'Pendiente', expired: 'Vencida', suspended: 'Suspendida' }
  const planLabels = { basica: 'Básica', premium: 'Premium', premium_plus: 'Premium Plus' }

  return <div className="page-content">
    <div className="page-heading-row"><div><p className="eyebrow">TU COMUNIDAD</p><h1>Clientes <span className="count-pill">{clients.length}</span></h1><p className="page-subtitle">Acompaña el progreso de cada persona, a su manera.</p></div><Button onClick={onAdd}><Plus size={16} /> Añadir cliente</Button></div>
    <div className="client-overview-strip">
      <div><span className="strip-icon"><Users size={18} /></span><span><strong>{activeCount}</strong><small> Activos ahora</small></span></div>
      <span className="strip-divider" />
      <div><span className="strip-stat">{clients.filter((client) => client.status === 'inactive').length}</span><span><small>En pausa</small></span></div>
      <span className="strip-divider" />
      <p>Un buen acompañamiento empieza por escuchar.</p>
    </div>
    <section className="panel clients-list-panel">
      <div className="list-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, objetivo..." /></div><div className="toolbar-right"><div className="filter-tabs">{(['all', 'active', 'inactive'] as const).map((value) => <button className={filter === value ? 'selected' : ''} key={value} onClick={() => setFilter(value)}>{value === 'all' ? 'Todos' : value === 'active' ? 'Activos' : 'En pausa'}</button>)}</div></div></div>
      {filtered.length ? <div className="table-scroll"><table className="data-table"><thead><tr><th>CLIENTE</th><th>OBJETIVO</th><th>RUTINA</th><th>MEMBRESÍA</th><th>INICIO</th><th>ESTADO</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{filtered.map((client) => <tr key={client.id}>
        <td><div className="table-client"><Avatar name={client.name} size="small" /><div><strong>{client.name}</strong><span>{client.email || client.phone || 'Sin contacto'}</span></div></div></td>
        <td><span className="table-goal">{client.goal}</span><small className="table-meta">{client.level}</small></td>
        <td>{getRoutineName(client.id) ? <span className="plan-tag"><ClipboardList size={13} />{getRoutineName(client.id)}</span> : <span className="no-plan">Sin rutina asignada</span>}</td>
        <td>{planLabels[client.membership]}<small className="table-meta">{membershipLabels[client.membershipStatus] ?? 'No disponible'}</small></td>
        <td className="date-cell">{new Date(`${client.startDate}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
        <td><span className={`status-badge ${client.status}`}><i />{client.status === 'active' ? 'Activo' : 'En pausa'}</span></td>
        <td><div className="table-actions"><button title="Asignar rutina" aria-label={`Asignar rutina a ${client.name}`} className="icon-button row-action" onClick={() => onAssign(client)} disabled={client.status !== 'active'}><UserRoundPlus size={16} /></button><button title="Invitar al portal" aria-label={`Invitar a ${client.name}`} className="icon-button row-action" onClick={() => onInvite(client)} disabled={!client.email}><AtSign size={16} /></button><button title="Editar cliente" aria-label={`Editar ${client.name}`} className="icon-button row-action" onClick={() => onEdit(client)}><MoreHorizontal size={17} /></button></div></td>
      </tr>)}</tbody></table></div> : <EmptyState icon={<UserRound size={20} />} title={query ? 'No encontramos coincidencias' : 'Todavía no hay clientes'} detail={query ? 'Prueba con otro nombre u objetivo.' : 'Añade a tu primer cliente para comenzar a crear planes.'} action={!query ? <Button onClick={onAdd}><Plus size={16} /> Añadir cliente</Button> : undefined} />}
    </section>
  </div>
}
