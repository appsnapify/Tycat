'use client'

import { v4 as uuidv4 } from 'uuid'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Função auxiliar: Sanitizar nome de arquivo
export function sanitizeFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  const name = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
  const extension = lastDot > 0 ? fileName.substring(lastDot) : ''
  
  const normalizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const cleanedName = normalizedName
    .replace(/[^a-zA-Z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  
  return cleanedName + extension
}

// Upload de flyer em modo edição
export async function handleEditModeFlyer(
  data: any, 
  existingFlyerUrl: string, 
  currentOrganization: any
): Promise<string | null> {
  if (data.flyer && data.flyer.length > 0 && data.flyer[0].name !== 'flyer-placeholder.png') {
    console.log("Modo Edição: Novo flyer selecionado. Iniciando upload...")
    const file = data.flyer[0]
    const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`
    const filePath = `${currentOrganization.id}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-flyers')
      .upload(filePath, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path)
    console.log("Modo Edição: Novo flyer carregado. URL:", urlData?.publicUrl ? '[URL_MASCARADA]' : 'null')
    return urlData?.publicUrl || null
  }
  
  if (data.flyer && data.flyer.length > 0 && data.flyer[0].name === 'flyer-placeholder.png') {
    console.log("Modo Edição: Placeholder detetado. Mantendo flyer URL existente:", existingFlyerUrl ? '[URL_MASCARADA]' : 'null')
    return existingFlyerUrl
  }
  
  if (!data.flyer || data.flyer.length === 0) {
    console.log("Modo Edição: Flyer removido explicitamente.")
    return null
  }
  
  console.warn("Modo Edição: Estado inesperado do flyer. Definindo URL do flyer como null.")
  return null
}

// Upload de flyer em modo criação
export async function handleCreationModeFlyer(data: any, currentOrganization: any): Promise<string | null> {
  if (data.flyer && data.flyer.length > 0) {
    console.log("Modo Criação: Flyer selecionado. Iniciando upload...")
    const file = data.flyer[0]
    const fileName = `${uuidv4()}-${sanitizeFileName(file.name)}`
    const filePath = `${currentOrganization.id}/${fileName}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('event-flyers')
      .upload(filePath, file, { upsert: true })
    if (uploadError) throw uploadError
    const { data: urlData } = supabase.storage.from('event-flyers').getPublicUrl(uploadData.path)
    console.log("Modo Criação: Flyer carregado. URL:", urlData?.publicUrl)
    return urlData?.publicUrl || null
  } else {
    console.log("Modo Criação: Nenhum flyer selecionado.")
    return null
  }
}

// Processar upload de flyer
export async function processFlyerUpload(
  data: any, 
  isEditMode: boolean, 
  existingFlyerUrl: string, 
  currentOrganization: any
): Promise<string | null> {
  try {
    if (isEditMode) {
      return await handleEditModeFlyer(data, existingFlyerUrl, currentOrganization)
    } else {
      return await handleCreationModeFlyer(data, currentOrganization)
    }
  } catch (uploadCatchError: any) {
    console.error("Erro detalhado no upload do flyer:", JSON.stringify(uploadCatchError, null, 2))
    let uploadUserMessage = "Falha no upload do flyer."
    if (uploadCatchError?.message) {
      uploadUserMessage += ` (${uploadCatchError.message})`
    }
    toast({ title: "Erro de Upload", description: uploadUserMessage, variant: "destructive" })
    throw uploadCatchError
  }
}
