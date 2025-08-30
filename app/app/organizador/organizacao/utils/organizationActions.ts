import { toast } from 'sonner'
import { OrganizationData, EditFormData } from '../types/Organization'
import { uploadLogo, uploadBanner, updateOrganizationData } from './fileUpload'

// ✅ FUNÇÃO: saveOrganizationChanges (Complexidade: 6 pontos)
export const saveOrganizationChanges = async (
  editFormData: EditFormData | null,
  organizationData: OrganizationData | null,
  setIsSaving: (saving: boolean) => void,
  setOrganizationData: (data: OrganizationData) => void
) => {
  if (!editFormData || !organizationData) return // +1

  setIsSaving(true)
  try { // +1
    let logoUrl = organizationData.logo_url
    let bannerUrl = organizationData.banner_url

    if (editFormData.logoFile) { // +1
      logoUrl = await uploadLogo(editFormData.logoFile, organizationData.id)
    }
    if (editFormData.bannerFile) { // +1
      bannerUrl = await uploadBanner(editFormData.bannerFile, organizationData.id)
    }

    const updatePayload = {
      name: editFormData.name, email: editFormData.email,
      address: editFormData.address, contacts: editFormData.contacts,
      social_media: {
        instagram: editFormData.instagram, facebook: editFormData.facebook,
        youtube: editFormData.youtube, tiktok: editFormData.tiktok,
      },
      logo_url: logoUrl, banner_url: bannerUrl,
    }

    const updatedData = await updateOrganizationData(updatePayload, organizationData.id)
    setOrganizationData(updatedData)
    toast.success('Dados atualizados com sucesso!')
  } catch (error: any) { // +1
    toast.error(error.message || 'Erro ao guardar alterações')
  } finally {
    setIsSaving(false)
  }
}


