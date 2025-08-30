import { OrganizationData, EditFormData } from '../types/Organization'
import { saveOrganizationChanges } from '../utils/organizationActions'
import { copyOrganizationLink } from '../utils/linkActions'

// ✅ HOOK DE AÇÕES: useOrganizationFormActions (Complexidade: 1 ponto)
export const useOrganizationFormActions = (
  organizationData: OrganizationData | null,
  setOrganizationData: (data: OrganizationData) => void
) => {
  const handleSaveChanges = (
    editFormData: EditFormData | null, 
    setIsSaving: (saving: boolean) => void
  ) => {
    return saveOrganizationChanges(editFormData, organizationData, setIsSaving, setOrganizationData)
  }

  const handleCopyLink = (setCopied: (copied: boolean) => void) => {
    return copyOrganizationLink(organizationData, setCopied)
  }

  return { handleSaveChanges, handleCopyLink }
}