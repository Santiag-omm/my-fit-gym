import { useState } from 'react'
import { Activity, ArrowRight, Dumbbell, LockKeyhole, Mail, Sparkles } from 'lucide-react'
import { Button, Field } from './ui'

type AccessRole = 'trainer' | 'client'

export function LoginView({ onSignIn, loading, error, configured }: {
  onSignIn: (email: string, password: string, role: AccessRole) => Promise<boolean>
  loading: boolean
  error: string
  configured: boolean
}) {
  const [role, setRole] = useState<AccessRole>('client')
  const [visitor, setVisitor] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [age, setAge] = useState('')
  const [result, setResult] = useState<number | null>(null)

  const calculate = (event: React.FormEvent) => {
    event.preventDefault()
    setResult(Number(weight) / (Number(height) / 100) ** 2)
  }

  return <main className="auth-page">
    <section className="auth-showcase">
      <div className="brand brand-light brand-logo"><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></div>
      <div className="auth-copy"><span className="eyebrow"><Sparkles size={14} /> TU ESPACIO DE ENTRENAMIENTO</span>
        <h1>Entrena con MY FIT GYM.<br /><span>Crece con propósito.</span></h1>
        <p>Un comienzo sencillo y un espacio personal para tu entrenamiento.</p></div>
      <div className="auth-feature-row"><div className="auth-feature"><Dumbbell size={17} /> Ejercicios guiados</div><div className="auth-feature"><Activity size={17} /> Tu progreso</div></div>
    </section>
    <section className="auth-form-side"><div className="auth-form-wrap">
      <div className="auth-mobile-brand brand brand-logo"><img src="/my-fit-gym-logo.svg" alt="MY FIT GYM" /></div>
      <div className="auth-role-tabs">
        <button type="button" className={visitor ? 'selected' : ''} onClick={() => setVisitor(true)}>Visitante</button>
        <button type="button" className={!visitor ? 'selected' : ''} onClick={() => setVisitor(false)}>Iniciar sesión</button>
      </div>
      {visitor ? <>
        <div className="auth-heading"><span className="auth-icon"><Activity size={20} /></span><h2>Conoce tu punto de partida</h2><p>Calcula tu índice de masa corporal (IMC) y explora ejercicios generales. Tus datos no se guardan ni se envían.</p></div>
        <form className="stack-form" onSubmit={calculate}>
          <div className="form-grid"><Field label="Peso (kg)"><input type="number" min="20" max="350" step="0.1" required value={weight} onChange={(e) => { setWeight(e.target.value); setResult(null) }} /></Field><Field label="Estatura (cm)"><input type="number" min="100" max="250" step="0.1" required value={height} onChange={(e) => { setHeight(e.target.value); setResult(null) }} /></Field></div>
          <Field label="Edad" hint="Este cálculo es para adultos; los menores necesitan una valoración profesional."><input type="number" min="18" max="110" step="1" required value={age} onChange={(e) => { setAge(e.target.value); setResult(null) }} /></Field>
          <Button type="submit">Calcular y ver ejercicios <ArrowRight size={16} /></Button>
        </form>
        {result !== null && <div className="visitor-results" role="status"><h3>Tu IMC aproximado: {result.toFixed(1)}</h3>
          <p>El IMC no mide composición corporal ni determina qué ejercicios son seguros para ti. Estas opciones son generales, no una rutina personalizada. Consulta a un profesional si tienes lesiones, dolor o alguna condición de salud; detente si aparece dolor.</p>
          <div className="visitor-exercises">{[
            { name: 'Sentadilla a una silla', image: 'box-squat-start.webp', detail: 'Siéntate y levántate de una silla estable, con control.' },
            { name: 'Puente de glúteos', image: 'glute-bridge-start.webp', detail: 'Boca arriba, eleva la cadera suavemente sin arquear la espalda.' },
            { name: 'Plancha', image: 'plank-main.webp', detail: 'Mantén el cuerpo alineado; apoya las rodillas si lo necesitas.' },
          ].map((exercise) => <article key={exercise.name}><img src={`/exercises/${exercise.image}`} alt={exercise.name} /><div><strong>{exercise.name}</strong><p>{exercise.detail}</p></div></article>)}</div>
          <a href="https://repdb.co" target="_blank" rel="noreferrer">Exercise data by RepDB (repdb.co)</a>
        </div>}
      </> : <>
        <div className="auth-heading"><span className="auth-icon"><LockKeyhole size={20} /></span><h2>Iniciar sesión</h2><p>Las cuentas de cliente se crean mediante invitación del administrador.</p></div>
        <div className="auth-role-tabs"><button type="button" className={role === 'client' ? 'selected' : ''} onClick={() => setRole('client')}>Cliente</button><button type="button" className={role === 'trainer' ? 'selected' : ''} onClick={() => setRole('trainer')}>Administrador</button></div>
        <form className="stack-form" onSubmit={(event) => { event.preventDefault(); void onSignIn(email.trim(), password, role) }}>
          <Field label="Correo electrónico"><div className="input-icon"><Mail size={16} /><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div></Field>
          <Field label="Contraseña"><div className="input-icon"><LockKeyhole size={16} /><input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div></Field>
          {!configured && <div className="inline-error" role="alert">El acceso no está disponible: configura Supabase en el servidor.</div>}
          {error && <div className="inline-error" role="alert">{error}</div>}
          <Button className="auth-submit" type="submit" disabled={loading || !configured}>{loading ? 'Iniciando sesión…' : 'Entrar'} <ArrowRight size={17} /></Button>
        </form>
      </>}
    </div></section>
  </main>
}
