// ✅ TIPOS DO SISTEMA USER v2

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl?: string
}

export interface AuthResponse {
  success: boolean
  user?: User
  session?: {
    access_token: string
    expires_at: string
  }
  error?: string
}

// ✅ NOVA: Resposta detalhada da verificação de telemóvel
export interface PhoneCheckResponse {
  success: boolean
  status?: 'NOVO' | 'EXISTE_USER' | 'EXISTE_CLIENTE' | 'BLOQUEADO'
  message: string
  exists: boolean // Para compatibilidade
  userInfo?: {
    firstName: string
    lastName: string
  }
  error?: string
}

export interface UserAuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

export interface EventGuest {
  id: string
  event_id: string
  qr_code_url: string
  checked_in: boolean
  check_in_time: string | null
  title: string
  date: string
  location: string
  flyer_url: string
  description?: string
  time?: string
}

export interface EventsResponse {
  success: boolean
  events?: EventGuest[]
  error?: string
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
}

export interface UserCache {
  user?: CacheEntry<User>
  events?: CacheEntry<EventGuest[]>
}

// Login Flow Types
export type LoginStep = 'phone' | 'password' | 'register'

export interface LoginState {
  step: LoginStep
  phone: string
  isCheckingPhone: boolean
  isSubmitting: boolean
  error: string | null
} 