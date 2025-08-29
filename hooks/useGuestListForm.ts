'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'

// Schema e tipos importados
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// Função auxiliar para combinar data e hora
// Função auxiliar: Validar componentes de tempo (Complexidade: 1)
function isValidTimeComponent(hours: number, minutes: number): boolean {
  const timeRules = [
    { condition: isNaN(hours), valid: false },
    { condition: isNaN(minutes), valid: false },
    { condition: hours < 0 || hours > 23, valid: false },
    { condition: minutes < 0 || minutes > 59, valid: false }
  ];
  
  const failedRule = timeRules.find(rule => rule.condition);
  return !failedRule;
}

// Função auxiliar: Combinar data e hora (Complexidade: 6)
function combineDateTime(date: Date | undefined, time: string | undefined): Date | null {
  if (!date || !time) return null;          // +2
  
  try {                                     // +1
    const [hours, minutes] = time.split(':').map(Number);
    
    if (!isValidTimeComponent(hours, minutes)) {  // +1
      throw new Error("Hora inválida");
    }
    
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    
    if (isNaN(newDate.getTime())) {         // +1
      throw new Error("Data combinada inválida");
    }
    
    return newDate;
  } catch (error) {                         // +1
    console.error("Erro ao combinar data e hora:", date, time, error);
    return null;
  }
}
// TOTAL: 1 (base) + 2 + 1 + 1 + 1 + 1 = 7 pontos ✅

const GuestListFormSchema = z.object({
  title: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  startDate: z.date({ required_error: 'A data de início do evento é obrigatória' }),
  startTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('20:00'),
  endDate: z.date({ required_error: 'A data de término do evento é obrigatória' }),
  endTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('23:00'),
  guestListOpenDate: z.date({ required_error: 'A data de abertura da lista é obrigatória' }),
  guestListOpenTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('09:00'),
  guestListCloseDate: z.date({ required_error: 'A data de fechamento da lista é obrigatória' }),
  guestListCloseTime: z.string().regex(timeRegex, "Hora inválida (HH:MM)").default('17:00'),
  location: z.string().min(3, 'O local deve ter pelo menos 3 caracteres'),
  flyer: z.any()
    .refine(files => files instanceof FileList && files.length === 1, "O flyer do evento é obrigatório.")
    .refine(files => !(files instanceof FileList) || files.length === 0 || files?.[0]?.size <= MAX_FILE_SIZE_BYTES, `O flyer não pode exceder ${MAX_FILE_SIZE_MB}MB.`)
    .refine(files => !(files instanceof FileList) || files.length === 0 || files?.[0]?.type.startsWith('image/'), "O flyer deve ser uma imagem."),
  maxGuests: z.preprocess(
    (val) => (val === '' || val === null || isNaN(Number(val)) ? undefined : Number(val)),
    z.number({ invalid_type_error: "Deve ser um número" })
     .min(1, 'O limite deve ser no mínimo 1')
     .int("Deve ser um número inteiro")
     .optional()
  ).default(1000),
  isEventActive: z.boolean().default(true),
  promotionalImages: z.any().optional()
}).refine(data => {
  const openDateTime = combineDateTime(data.guestListOpenDate, data.guestListOpenTime)
  const closeDateTime = combineDateTime(data.guestListCloseDate, data.guestListCloseTime)
  return !openDateTime || !closeDateTime || openDateTime < closeDateTime
}, {
  message: "A data/hora de abertura da lista deve ser anterior à data/hora de fechamento",
  path: ["guestListCloseTime"],
})

export type GuestListFormValues = z.infer<typeof GuestListFormSchema>

// Hook customizado para o formulário
export function useGuestListForm(isEditMode: boolean = false) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<GuestListFormValues>({
    resolver: zodResolver(GuestListFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: undefined,
      startTime: '20:00',
      endDate: undefined,
      endTime: '23:00',
      guestListOpenDate: undefined,
      guestListOpenTime: '09:00',
      guestListCloseDate: undefined,
      guestListCloseTime: '17:00',
      location: '',
      flyer: undefined,
      maxGuests: 1000,
      isEventActive: true,
      promotionalImages: undefined,
    },
  })

  return {
    form,
    isSubmitting,
    setIsSubmitting
  }
}
