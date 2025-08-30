import React from 'react'
import { EditFormData } from '../types/Organization'

// ✅ HOOK DE HANDLERS: useOrganizationFormHandlers (Complexidade: 2 pontos)
export const useOrganizationFormHandlers = (
  setEditFormData: (data: EditFormData | null) => void,
  setLogoPreview: (preview: string | null) => void,
  setBannerPreview: (preview: string | null) => void
) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => prev ? { ...prev, [name]: value } : null)
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { // +1
      setEditFormData(prev => prev ? { ...prev, logoFile: file } : null)
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { // +1
      setEditFormData(prev => prev ? { ...prev, bannerFile: file } : null)
      const previewUrl = URL.createObjectURL(file)
      setBannerPreview(previewUrl)
    }
  }

  return { handleInputChange, handleLogoChange, handleBannerChange }
}
