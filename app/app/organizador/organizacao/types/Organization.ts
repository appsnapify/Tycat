// ✅ TIPOS E INTERFACES (Complexidade: 1 ponto)
export interface OrganizationData {
  id: string
  name: string
  email: string
  address: string
  contacts: string
  logo_url?: string
  banner_url?: string
  slug?: string
  social_media?: {
    instagram?: string
    facebook?: string
    youtube?: string
    tiktok?: string
    twitter?: string
    website?: string
  }
}

export interface EditFormData {
  name: string
  email: string
  address: string
  contacts: string
  instagram: string
  facebook: string
  youtube: string
  tiktok: string
  logoFile: File | null
  bannerFile: File | null
}
