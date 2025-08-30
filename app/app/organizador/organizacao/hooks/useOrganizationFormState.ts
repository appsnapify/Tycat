import { useState, useEffect } from 'react'
import { OrganizationData, EditFormData } from '../types/Organization'

// ✅ HOOK DE ESTADO: useOrganizationFormState (Complexidade: 1 ponto)
export const useOrganizationFormState = (organizationData: OrganizationData | null) => {
  const [isSaving, setIsSaving] = useState(false)
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (organizationData) { // +1
      setEditFormData({
        name: organizationData.name || '',
        email: organizationData.email || '',
        address: organizationData.address || '',
        contacts: organizationData.contacts || '',
        instagram: organizationData.social_media?.instagram || '',
        facebook: organizationData.social_media?.facebook || '',
        youtube: organizationData.social_media?.youtube || '',
        tiktok: organizationData.social_media?.tiktok || '',
        logoFile: null,
        bannerFile: null,
      })
      setLogoPreview(organizationData.logo_url || null)
      setBannerPreview(organizationData.banner_url || null)
    }
  }, [organizationData])

  return {
    isSaving, setIsSaving, editFormData, setEditFormData,
    logoPreview, setLogoPreview, bannerPreview, setBannerPreview,
    copied, setCopied
  }
}
