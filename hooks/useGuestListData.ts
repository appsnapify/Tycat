'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'
import { GuestListFormValues } from './useGuestListForm'

const supabase = createClient()

// Funções utilitárias para data/hora
function extractDate(dateTime: Date | string | null | undefined): Date | undefined {
  if (!dateTime) return undefined
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return undefined
    date.setHours(0, 0, 0, 0)
    return date
  } catch (error) {
    console.error("Erro ao extrair data:", dateTime, error)
    return undefined
  }
}

function extractTime(dateTime: Date | string | null | undefined): string {
  if (!dateTime) return '00:00'
  try {
    const date = new Date(dateTime)
    if (isNaN(date.getTime())) return '00:00'
    return format(date, 'HH:mm')
  } catch (error) {
    console.error("Erro ao extrair hora:", dateTime, error)
    return '00:00'
  }
}

// Hook para carregar dados do evento
export function useGuestListData(
  eventId: string | null, 
  currentOrganization: any,
  form: any
) {
  const [isLoading, setIsLoading] = useState(!!eventId)
  const [isEditMode, setIsEditMode] = useState(!!eventId)
  const [existingFlyerUrl, setExistingFlyerUrl] = useState<string | null>(null)
  const [existingPromoImageUrls, setExistingPromoImageUrls] = useState<string[]>([])
  const router = useRouter()

  useEffect(() => {
    async function loadEventData() {
      if (eventId && currentOrganization?.id) {
        setIsLoading(true)
        try {
          console.log("Carregando evento para edição:", eventId)
          const { data: event, error: eventError } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('organization_id', currentOrganization.id)
            .single()
          
          if (eventError || !event) {
            console.error("Erro ao carregar evento:", eventError)
            toast({ 
              title: "Erro", 
              description: "Não foi possível carregar os dados do evento", 
              variant: "destructive" 
            })
            router.push('/app/organizador/eventos')
            return
          }

          if (event.type !== 'guest-list') {
            console.error("Evento não é do tipo guest list")
            toast({ 
              title: "Tipo incorreto", 
              description: "Este evento não é uma guest list", 
              variant: "destructive" 
            })
            router.push('/app/organizador/eventos')
            return
          }
          
          // Buscar materiais promocionais
          const { data: promoMaterials, error: promoError } = await supabase
            .from('promotional_materials')
            .select('image_url')
            .eq('event_id', eventId)

          if (!promoError) {
            const urls = promoMaterials?.map(m => m.image_url) || []
            setExistingPromoImageUrls(urls)
          }

          // Processar flyer
          let flyerValue: FileList | undefined = undefined
          if (typeof window !== 'undefined') { 
            if (event.flyer_url) {
              setExistingFlyerUrl(event.flyer_url)
              const dummyFile = new File(["existing"], "flyer-placeholder.png", { type: "image/png" })
              const dataTransfer = new DataTransfer()
              dataTransfer.items.add(dummyFile)
              flyerValue = dataTransfer.files
            } else {
              setExistingFlyerUrl(null)
              const dataTransfer = new DataTransfer()
              flyerValue = dataTransfer.files
            }
          }

          // Preencher formulário
          form.reset({
            title: event.title || '',
            description: event.description || '',
            startDate: extractDate(event.date),
            startTime: event.time ? format(new Date(`1970-01-01T${event.time}`), 'HH:mm') : '00:00',
            endDate: extractDate(event.end_date || event.date),
            endTime: event.end_time ? format(new Date(`1970-01-01T${event.end_time}`), 'HH:mm') : '23:00',
            guestListOpenDate: extractDate(event.guest_list_open_datetime),
            guestListOpenTime: extractTime(event.guest_list_open_datetime),
            guestListCloseDate: extractDate(event.guest_list_close_datetime),
            guestListCloseTime: extractTime(event.guest_list_close_datetime),
            location: event.location || '',
            maxGuests: (event.guest_list_settings as any)?.max_guests ?? 1000,
            isEventActive: event.is_published !== false,
            flyer: flyerValue,
            promotionalImages: undefined
          })

        } catch (error) {
          console.error("Erro inesperado ao carregar evento:", error)
          toast({ 
            title: "Erro", 
            description: "Ocorreu um problema ao carregar os dados do evento", 
            variant: "destructive" 
          })
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }
    loadEventData()
  }, [eventId, currentOrganization?.id, form, router])

  return {
    isLoading,
    isEditMode,
    existingFlyerUrl,
    existingPromoImageUrls,
    setExistingFlyerUrl
  }
}
