// types/client.ts
// Tipos para sistema de autenticação de clientes

export interface ClientUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  auth_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ClientUserProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  auth_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PhoneVerificationResult {
  exists: boolean;
  userId: string | null;
  source?: 'cache' | 'database';
  responseTime?: number;
}

export interface GuestCreationData {
  event_id: string;
  client_user_id: string;
  promoter_id: string;
  team_id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface GuestResult {
  id: string;
  qr_code_url: string;
  created_at?: string;
} 