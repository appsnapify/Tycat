// 🎯 **TIPOS TYPESCRIPT - ESPAÇO DO CLIENTE**
// Sistema 100% isolado - Zero conflitos com outros tipos

export interface ClientUser {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
  birth_date?: Date;
  gender?: 'M' | 'F' | 'O';
  city?: string;
  postal_code?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ClientRegistrationData {
  phone: string;
  first_name: string;
  last_name: string;
  email?: string;
  birth_date?: Date;
  gender?: 'M' | 'F' | 'O';
  city?: string;
  postal_code?: string;
  password: string;
  confirm_password: string;
}

export interface ClientLoginData {
  phone: string;
  password: string;
}

export interface ClientEvent {
  event_id: string;
  title: string;
  description?: string;
  event_date: Date;
  location?: string;
  flyer_url?: string;
  qr_code?: string;
  qr_code_url?: string;
  guest_name: string;
  checked_in: boolean;
  check_in_time?: Date;
  attendance_status: 'registered' | 'attended';
}

export interface ClientDashboardStats {
  total_events: number;
  upcoming_events: number;
  past_events: number;
  active_qr_codes: number;
}

export interface ClientSession {
  user: ClientUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface ClientAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ClientUser | null;
  session: ClientSession | null;
  error: string | null;
}

export interface ClientApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface ClientLoginResponse extends ClientApiResponse {
  data?: {
    user: ClientUser;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ClientRegistrationResponse extends ClientApiResponse {
  data?: {
    user: ClientUser;
    message: string;
  };
}

export interface ClientEventsResponse extends ClientApiResponse {
  data?: ClientEvent[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ClientStatsResponse extends ClientApiResponse {
  data?: ClientDashboardStats;
}

// Enums para consistência
export enum ClientEventType {
  UPCOMING = 'upcoming',
  PAST = 'past'
}

export enum ClientGender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O'
}

export enum ClientAttendanceStatus {
  REGISTERED = 'registered',
  ATTENDED = 'attended'
}

// Types para componentes UI
export interface ClientStatsCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color: 'emerald' | 'violet' | 'amber' | 'slate';
}

export interface ClientNavItem {
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

export interface ClientFormError {
  field: string;
  message: string;
}

export interface ClientValidationResult {
  isValid: boolean;
  errors: ClientFormError[];
}

// Types para rate limiting
export interface ClientRateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Types para middleware
export interface ClientJWTPayload {
  id: string;
  phone: string;
  type: 'client';
  iat: number;
  exp: number;
}

export interface ClientRequestContext {
  user: ClientJWTPayload;
  rateLimit: ClientRateLimitResult;
}

// Types para hooks
export interface UseClientAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: ClientUser | null;
  login: (data: ClientLoginData) => Promise<ClientLoginResponse>;
  register: (data: ClientRegistrationData) => Promise<ClientRegistrationResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  error: string | null;
  clearError: () => void;
}

export interface UseClientEventsReturn {
  events: ClientEvent[];
  upcomingEvents: ClientEvent[];
  pastEvents: ClientEvent[];
  isLoading: boolean;
  error: string | null;
  fetchEvents: () => Promise<void>;
  fetchUpcoming: (limit?: number) => Promise<void>;
  fetchPast: (page?: number, limit?: number) => Promise<void>;
  refreshEvents: () => Promise<void>;
}

export interface UseClientProfileReturn {
  profile: ClientUser | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<ClientUser>) => Promise<ClientApiResponse>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<ClientApiResponse>;
  refreshProfile: () => Promise<void>;
}

// Constantes de configuração
export const CLIENT_CONFIG = {
  JWT_EXPIRY: 15 * 60 * 1000, // 15 minutos
  REFRESH_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 dias
  RATE_LIMITS: {
    login: { requests: 5, window: 15 * 60 * 1000 },
    register: { requests: 3, window: 60 * 60 * 1000 },
    profile: { requests: 20, window: 60 * 1000 },
    events: { requests: 100, window: 60 * 1000 }
  },
  VALIDATION: {
    PHONE_REGEX: /^\+[0-9]{6,15}$/,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;:,.<>?])(?!.*\s).{12,128}$/,
    NAME_REGEX: /^[a-zA-ZÀ-ÿ\s'-]+$/,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
} as const;

export default CLIENT_CONFIG;