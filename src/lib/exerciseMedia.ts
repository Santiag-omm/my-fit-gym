import { safeHttpUrl } from './url'

export const exerciseImages = [
  { name: 'Sentadilla a una silla', path: '/exercises/box-squat-start.webp' },
  { name: 'Puente de glúteos', path: '/exercises/glute-bridge-start.webp' },
  { name: 'Plancha', path: '/exercises/plank-main.webp' },
  { name: 'Press de banca con barra', path: '/exercises/bench-press-start.webp' },
  { name: 'Curl de bíceps con mancuernas', path: '/exercises/bicep-curl-start.webp' },
  { name: 'Jalón al pecho', path: '/exercises/lat-pulldown-start.webp' },
  { name: 'Peso muerto rumano', path: '/exercises/romanian-deadlift-start.webp' },
]

export function safeMediaUrl(value: string) {
  if (exerciseImages.some((image) => image.path === value)) return value
  return safeHttpUrl(value)
}
