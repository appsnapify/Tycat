'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Form } from '@/components/ui/form'
import { toast } from '@/components/ui/use-toast'
import { useOrganization } from '@/app/contexts/organization-context'
import { Skeleton } from '@/components/ui/skeleton'

// Hooks customizados
import { useGuestListForm, GuestListFormValues } from '@/hooks/useGuestListForm'
import { useGuestListData } from '@/hooks/useGuestListData'
import { useFileHandlers } from '@/hooks/useFileHandlers'

// Componentes modulares
import { BasicDetailsSection } from '@/components/guest-list/BasicDetailsSection'
import { EventDateTimeSection } from '@/components/guest-list/EventDateTimeSection'
import { GuestListDateTimeSection } from '@/components/guest-list/GuestListDateTimeSection'
import { AdditionalSettingsSection } from '@/components/guest-list/AdditionalSettingsSection'
import { PromotionalMaterialsSection } from '@/components/guest-list/PromotionalMaterialsSection'

// Funções de submissão
import {
  validateSubmissionRequirements,
  processFlyerUpload,
  prepareDateTimesAndValidate,
  buildEventDataObject,
  saveEventToDatabase,
} from '@/lib/guest-list-submission'

// Importar componente de loading
import LoadingSkeleton from './components/LoadingSkeleton'

// Importar hook de submissão
import { useGuestListSubmission } from './hooks/useGuestListSubmission'

// Componente principal refatorado
export default function GuestListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const { currentOrganization } = useOrganization()
  
  // Hooks customizados
  const { form, isSubmitting, setIsSubmitting } = useGuestListForm(!!eventId)
  const { isLoading, isEditMode, existingFlyerUrl, existingPromoImageUrls } = useGuestListData(
    eventId, 
    currentOrganization, 
    form
  )
  const {
    flyerPreview,
    setFlyerPreview,
    promotionalFiles,
    promotionalPreviews,
    handleFileChange,
    handlePromotionalFilesChange,
    removePromotionalImage,
    MAX_PROMO_IMAGES,
    MAX_FILE_SIZE_MB
  } = useFileHandlers(form)
  
  const {
    processPromotionalMaterials,
    handleSubmissionSuccess,
    handleSubmissionError
  } = useGuestListSubmission(
    currentOrganization,
    isEditMode,
    existingFlyerUrl,
    eventId,
    promotionalFiles
  )

  // Inicializar datas padrão
  useEffect(() => {
    if (!isEditMode && !form.formState.isDirty) {
      const now = new Date()
      const defaultEventStartDate = new Date()
      defaultEventStartDate.setDate(defaultEventStartDate.getDate() + 3)
      defaultEventStartDate.setHours(0, 0, 0, 0)
      
      const defaultEventEndDate = new Date(defaultEventStartDate)
      const defaultCloseDate = new Date(defaultEventStartDate)

      form.reset({
        ...form.getValues(),
        startDate: defaultEventStartDate,
        endDate: defaultEventEndDate,
        guestListOpenDate: now,
        guestListCloseDate: defaultCloseDate,
      })
    }
  }, [isEditMode, form])

  // Função principal de submissão (complexidade reduzida)
  const onSubmitGuestList = async (data: GuestListFormValues) => {
    console.log("Submetendo formulário com dados:", { 
      title: data.title, 
      location: data.location, 
      hasStartDate: !!data.startDate,
      hasEndDate: !!data.endDate 
    })

    const validation = await validateSubmissionRequirements(currentOrganization)
    if (!validation.isValid) return

    setIsSubmitting(true)

    try {
      const flyerUrl = await processFlyerUpload(data, isEditMode, existingFlyerUrl || '', currentOrganization)
      
      const dateTimeValidation = prepareDateTimesAndValidate(data)
      if (!dateTimeValidation.isValid) {
        setIsSubmitting(false)
        return
      }

      const eventData = buildEventDataObject(
        data, 
        flyerUrl, 
        currentOrganization, 
        dateTimeValidation.dateTimes!, 
        isEditMode, 
        eventId || undefined
      )

      const savedEventId = await saveEventToDatabase(eventData)
      if (!savedEventId) {
        setIsSubmitting(false)
        return
      }

      await processPromotionalMaterials(savedEventId)
      handleSubmissionSuccess(data.title)

    } catch (error: any) {
      handleSubmissionError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render loading
  if (isLoading) {
    return <LoadingSkeleton />
  }

  return (
    <div className="p-4 md:p-8 lg:p-10">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        {isEditMode ? 'Editar Evento (Guest List)' : 'Criar Novo Evento (Guest List)'}
      </h1>
      
      {!currentOrganization && !isLoading && (
        <Card className="max-w-4xl mx-auto text-center p-6">
          <p className="text-destructive">
            Organização não encontrada. Por favor, selecione uma organização válida.
          </p>
        </Card>
      )}
      
      {currentOrganization && (
        <Card className="max-w-4xl mx-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitGuestList)}>
              <CardContent className="p-6 space-y-8">
                <BasicDetailsSection form={form} />
                <EventDateTimeSection form={form} />
                <GuestListDateTimeSection form={form} />
                <AdditionalSettingsSection 
                  form={form} 
                  flyerPreview={flyerPreview} 
                  handleFileChange={handleFileChange} 
                />
                <PromotionalMaterialsSection
                  form={form}
                  isEditMode={isEditMode}
                  existingPromoImageUrls={existingPromoImageUrls}
                  promotionalFiles={promotionalFiles}
                  promotionalPreviews={promotionalPreviews}
                  handlePromotionalFilesChange={handlePromotionalFilesChange}
                  removePromotionalImage={removePromotionalImage}
                  MAX_PROMO_IMAGES={MAX_PROMO_IMAGES}
                  MAX_FILE_SIZE_MB={MAX_FILE_SIZE_MB}
                />
              </CardContent>
              <CardFooter className="border-t p-6">
                <Button type="submit" disabled={isSubmitting || isLoading} className="ml-auto">
                  {isSubmitting ? 'Salvando...' : (isEditMode ? 'Salvar Alterações' : 'Criar Evento')}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}
    </div>
  )
}
