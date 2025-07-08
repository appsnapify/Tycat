// Tipos específicos para o sistema login/cliente isolado
export interface ClienteUser {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  birth_date?: string;
  postal_code: string;
  gender?: 'M' | 'F' | 'O';
  created_at: string;
  updated_at: string;
}

export interface PhoneCheckResponse {
  success: boolean;
  exists: boolean;
  userId?: string;
  error?: string;
}

export interface LoginRequest {
  phone?: string;
  userId?: string;
  password: string;
}

export interface RegisterRequest {
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  birth_date?: string;
  postal_code: string;
  gender?: 'M' | 'F' | 'O';
}

export interface AuthResponse {
  success: boolean;
  user?: ClienteUser;
  error?: string;
  details?: string;
} 