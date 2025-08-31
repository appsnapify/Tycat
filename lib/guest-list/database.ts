'use client'

import { format } from 'date-fns'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

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
  console.log("Dados a serem enviados para upsert:", { 
    title: eventData.title, 
    type: eventData.type, 
    organization_id: eventData.organization_id ? eventData.organization_id.substring(0, 8) + '...' : null,
    id: eventData.id ? eventData.id.substring(0, 8) + '...' : 'novo'
  })

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
  console.log("Upsert do evento bem-sucedido. Evento ID:", savedEventId ? savedEventId.substring(0, 8) + '...' : 'null')
  return savedEventId || null
}
