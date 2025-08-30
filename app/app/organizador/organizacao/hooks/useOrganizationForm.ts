import { OrganizationData } from '../types/Organization'
import { useOrganizationFormState } from './useOrganizationFormState'
import { useOrganizationFormHandlers } from './useOrganizationFormHandlers'
import { useOrganizationFormActions } from './useOrganizationFormActions'

// ✅ HOOK ORQUESTRADOR: useOrganizationForm (Complexidade: 1 ponto)
export const useOrganizationForm = (
  organizationData: OrganizationData | null,
  setOrganizationData: (data: OrganizationData) => void
) => {
  const {
    isSaving, setIsSaving, editFormData, setEditFormData,
    logoPreview, setLogoPreview, bannerPreview, setBannerPreview,
    copied, setCopied
  } = useOrganizationFormState(organizationData)

  const { handleInputChange, handleLogoChange, handleBannerChange } = 
    useOrganizationFormHandlers(setEditFormData, setLogoPreview, setBannerPreview)

  const { handleSaveChanges: saveChanges, handleCopyLink: copyLink } = 
    useOrganizationFormActions(organizationData, setOrganizationData)

  const handleSaveChanges = () => saveChanges(editFormData, setIsSaving)
  const handleCopyLink = () => copyLink(setCopied)

  return {
    isSaving, editFormData, logoPreview, bannerPreview, copied,
    handleInputChange, handleLogoChange, handleBannerChange,
    handleSaveChanges, handleCopyLink
  }
}