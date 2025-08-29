'use client'

import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'
import { GuestListFormValues } from '@/hooks/useGuestListForm'

const supabase = createClient()

// Função auxiliar: Sanitizar nome de arquivo
function sanitizeFileName(fileName: string): string {
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

// Função auxiliar: Combinar data e hora
function combineDateTime(date: Date | undefined, time: string | undefined): Date | null {
  if (!date || !time) return null
  try {
    const [hours, minutes] = time.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      throw new Error("Hora inválida")
    }
    const newDate = new Date(date)
    newDate.setHours(hours, minutes, 0, 0)
    if (isNaN(newDate.getTime())) {
      throw new Error("Data combinada inválida")
    }
    return newDate
  } catch (error) {
    console.error("Erro ao combinar data e hora:", date, time, error)
    return null
  }
}

// Validação inicial
export async function validateSubmissionRequirements(currentOrganization: any) {
  if (!currentOrganization) {
    toast({ 
      title: "Nenhuma organização selecionada", 
      description: "Selecione uma organização", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  const { data: authData, error: authError } = await supabase.auth.getSession()
  if (authError || !authData.session) {
    toast({ 
      title: "Erro de autenticação", 
      description: "Sessão inválida. Faça login novamente.", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  return { isValid: true, authData }
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
    console.log("Modo Edição: Novo flyer carregado. URL:", urlData?.publicUrl)
    return urlData?.publicUrl || null
  }
  
  if (data.flyer && data.flyer.length > 0 && data.flyer[0].name === 'flyer-placeholder.png') {
    console.log("Modo Edição: Placeholder detetado. Mantendo flyer URL existente:", existingFlyerUrl)
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

// Preparar e validar datas
export function prepareDateTimesAndValidate(data: any) {
  const startDateTime = combineDateTime(data.startDate, data.startTime)
  const endDateTime = combineDateTime(data.endDate, data.endTime)
  const guestListOpenDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime)
  const guestListCloseDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime)

  if (!startDateTime || !endDateTime || !guestListOpenDateTime || !guestListCloseDateTime) {
    console.error("Erro crítico ao combinar datas/horas:", { 
      startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime 
    })
    toast({ 
      title: "Erro de Data/Hora", 
      description: "Ocorreu um erro ao processar as datas e horas. Verifique os valores inseridos.", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  if (startDateTime > endDateTime) {
    toast({ 
      title: "Erro de Data", 
      description: "A data/hora de início não pode ser depois da data/hora de fim.", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  if (guestListOpenDateTime >= guestListCloseDateTime) {
    toast({ 
      title: "Erro de Data", 
      description: "A abertura da lista deve ser antes do fecho.", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  if (guestListCloseDateTime > endDateTime) {
    toast({ 
      title: "Erro de Data", 
      description: "A lista deve fechar antes ou ao mesmo tempo que o evento termina.", 
      variant: "destructive" 
    })
    return { isValid: false }
  }

  return { 
    isValid: true, 
    dateTimes: { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime }
  }
}

// Construir objeto de dados do evento
export function buildEventDataObject(
  data: any, 
  flyerUrl: string | null, 
  currentOrganization: any, 
  dateTimes: any, 
  isEditMode: boolean, 
  eventId?: string
): any {
  const { startDateTime, endDateTime, guestListOpenDateTime, guestListCloseDateTime } = dateTimes
  
  return {
    ...(isEditMode && eventId ? { id: eventId } : {}),
    organization_id: currentOrganization.id,
    title: data.title,
    description: data.description,
    date: format(startDateTime, 'yyyy-MM-dd'),
    time: format(startDateTime, 'HH:mm:ss'),
    end_date: format(endDateTime, 'yyyy-MM-dd'),
    end_time: format(endDateTime, 'HH:mm:ss'),
    location: data.location,
    flyer_url: flyerUrl,
    type: 'guest-list' as const,
    is_published: data.isEventActive,
    guest_list_open_datetime: guestListOpenDateTime.toISOString(),
    guest_list_close_datetime: guestListCloseDateTime.toISOString(),
    guest_list_settings: {
      max_guests: data.maxGuests ?? 1000,
    },
  }
}

// Tratar erros de database
export function handleDatabaseError(upsertError: any): void {
  console.error("Erro detalhado no upsert do evento:", JSON.stringify(upsertError, null, 2))

  let userMessage = "Ocorreu um erro desconhecido ao salvar o evento."
  if (upsertError.message) {
    userMessage = `Erro ao salvar: ${upsertError.message}`
  }
  if (upsertError.code === '23505') {
    userMessage = "Erro: Já existe um evento com detalhes semelhantes (possivelmente título e datas iguais)."
  } else if (upsertError.code === '23503') {
    userMessage = "Erro: A organização associada não foi encontrada ou houve um problema de permissão."
  } else if (upsertError.code === '22007' || upsertError.code === '22008') {
    userMessage = "Erro: Formato inválido de data ou hora fornecido."
  }
  
  toast({ title: "Erro ao Salvar Evento", description: userMessage, variant: "destructive" })
}

// Salvar evento no database
export async function saveEventToDatabase(eventData: any): Promise<string | null> {
  console.log("Dados a serem enviados para upsert:", eventData)

  const { data: upsertResult, error: upsertError } = await supabase
    .from('events')
    .upsert(eventData, { onConflict: 'id' })
    .select('id')
    .single()

  if (upsertError) {
    handleDatabaseError(upsertError)
    return null
  }

  const savedEventId = upsertResult?.id
  console.log("Upsert do evento bem-sucedido. Evento ID:", savedEventId)
  return savedEventId || null
}
