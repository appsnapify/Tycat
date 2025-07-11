export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          role: 'organizador' | 'promotor'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          role: 'organizador' | 'promotor'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          role?: 'organizador' | 'promotor'
          created_at?: string
          updated_at?: string
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          address: string | null
          location: string | null
          email: string | null
          contacts: string[] | null
          social_media: Json | null
          banner_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          location?: string | null
          email?: string | null
          contacts?: string[] | null
          social_media?: Json | null
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          location?: string | null
          email?: string | null
          contacts?: string[] | null
          social_media?: Json | null
          banner_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_organizations: {
        Row: {
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
        }
        Insert: {
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'member'
          created_at?: string
        }
        Update: {
          user_id?: string
          organization_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          created_at: string
          name: string
          description: string | null
          team_code: string
          created_by: string
          member_count: number
        }
        Insert: {
          id?: string
          created_at?: string
          name: string
          description?: string | null
          team_code: string
          created_by: string
          member_count?: number
        }
        Update: {
          id?: string
          created_at?: string
          name?: string
          description?: string | null
          team_code?: string
          created_by?: string
          member_count?: number
        }
      }
      team_members: {
        Row: {
          id: string
          created_at: string
          team_id: string
          user_id: string
          role: string
        }
        Insert: {
          id?: string
          created_at?: string
          team_id: string
          user_id: string
          role: string
        }
        Update: {
          id?: string
          created_at?: string
          team_id?: string
          user_id?: string
          role?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string
          time: string | null
          location: string | null
          flyer_url: string | null
          is_published: boolean
          guest_list_open_datetime: string | null
          guest_list_close_datetime: string | null
          organization_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date: string
          time?: string | null
          location?: string | null
          flyer_url?: string | null
          is_published?: boolean
          guest_list_open_datetime?: string | null
          guest_list_close_datetime?: string | null
          organization_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string
          time?: string | null
          location?: string | null
          flyer_url?: string | null
          is_published?: boolean
          guest_list_open_datetime?: string | null
          guest_list_close_datetime?: string | null
          organization_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      event_promoters: {
        Row: {
          id: string
          event_id: string
          promoter_id: string
          team_id: string
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          promoter_id: string
          team_id: string
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          promoter_id?: string
          team_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_promoter_team_v2: {
        Args: {
          p_team_name: string
          p_team_description: string
        }
        Returns: Json
      },
      get_public_promoter_page_data: {
        Args: {
          promoter_user_id: string
        }
        Returns: {
          promoter_first_name: string | null
          promoter_last_name: string | null
          promoter_avatar_url: string | null
          event_id: string
          event_title: string | null
          event_flyer_url: string | null
          event_type: string | null
          event_date: string | null
          event_time: string | null
          org_id: string | null
          org_name: string | null
          org_logo_url: string | null
          tracking_promoter_id: string
          tracking_team_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export interface Organization {
  id: string
  name: string
  address: string
  location: string
  email: string
  contacts: {
    phone: string
    whatsapp?: string
  }
  social_media: {
    instagram?: string
    facebook?: string
    website?: string
  }
  banner_url?: string
  logotipo?: string
  created_at: string
  updated_at: string
} 