export type UserRole = 'trainer' | 'client'
export type Membership = 'basica' | 'premium' | 'premium_plus'
export type MembershipStatus = 'active' | 'pending' | 'expired' | 'suspended'

export type Client = {
  id: string
  name: string
  email: string
  phone: string
  goal: string
  level: string
  startDate: string
  notes: string
  status: 'active' | 'inactive'
  membership: Membership
  membershipStatus: MembershipStatus
}

export type Exercise = {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  instructions: string
  videoUrl: string
  mediaUrl: string
}

export type RoutineExercise = {
  id: string
  exerciseId: string
  name: string
  muscleGroup: string
  equipment: string
  instructions: string
  videoUrl: string
  mediaUrl: string
  sets: number
  reps: string
  restSeconds: number
  tempo: string
  suggestedLoad: string
}

export type RoutineDay = {
  id: string
  number: number
  title: string
  focus: string
  exercises: RoutineExercise[]
}

export type Routine = {
  id: string
  name: string
  goal: string
  durationWeeks: number
  archived: boolean
  days: RoutineDay[]
}

export type Assignment = {
  id: string
  clientId: string
  routineId: string
  startDate: string
  endDate: string
  active: boolean
}

export type WorkoutEntry = {
  exerciseId: string
  exerciseName?: string
  muscleGroup?: string
  equipment?: string
  weight: string
  reps: string
}

export type WorkoutLog = {
  id: string
  clientId: string
  assignmentId: string
  routineDayId: string
  routineDayTitle: string
  routineDayFocus: string
  completedAt: string
  comments: string
  entries: WorkoutEntry[]
}

export type WorkspaceData = {
  clients: Client[]
  exercises: Exercise[]
  routines: Routine[]
  assignments: Assignment[]
  logs: WorkoutLog[]
}

export type Profile = {
  id: string
  fullName: string
  role: UserRole
}
