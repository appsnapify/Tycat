import { createClient } from '@/lib/supabase'

const supabase = createClient()

// ✅ FUNÇÃO UTILITÁRIA: uploadLogo (Complexidade: 3 pontos)
export const uploadLogo = async (logoFile: File, orgId: string) => {
  const fileExt = logoFile.name.split('.').pop()
  const filePath = `public/${orgId}/logo-${Date.now()}.${fileExt}`
  const { error: uploadError } = await supabase.storage
    .from('organization_logos').upload(filePath, logoFile)
  if (uploadError) { // +1
    throw new Error(uploadError.message || 'Falha no upload do logo.')
  }
  const { data: urlData } = supabase.storage
    .from('organization_logos').getPublicUrl(filePath)
  return urlData.publicUrl
}

// ✅ FUNÇÃO UTILITÁRIA: uploadBanner (Complexidade: 3 pontos)
export const uploadBanner = async (bannerFile: File, orgId: string) => {
  const fileExt = bannerFile.name.split('.').pop()
  const filePath = `public/${orgId}/banner-${Date.now()}.${fileExt}`
  const { error: uploadError } = await supabase.storage
    .from('organization_banners').upload(filePath, bannerFile)
  if (uploadError) { // +1
    throw new Error(uploadError.message || 'Falha no upload do banner.')
  }
  const { data: urlData } = supabase.storage
    .from('organization_banners').getPublicUrl(filePath)
  return urlData.publicUrl
}

// ✅ FUNÇÃO UTILITÁRIA: updateOrganizationData (Complexidade: 2 pontos)
export const updateOrganizationData = async (updatePayload: any, orgId: string) => {
  const { data: updatedData, error: updateError } = await supabase
    .from('organizations').update(updatePayload).eq('id', orgId).select().single()
  if (updateError) { // +1
    throw new Error(updateError.message || 'Falha ao guardar alterações.')
  }
  return updatedData
}
