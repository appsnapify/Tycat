'use client'

import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'

const supabase = createClient()

// Função auxiliar: Combinar data e hora
export function combineDateTime(date: Date | undefined, time: string | undefined): Date | null {
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
