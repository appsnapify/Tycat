import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'

// Hook para lógica de submissão
export function useGuestListSubmission(
  currentOrganization: any,
  isEditMode: boolean,
  existingFlyerUrl: string | null,
  eventId: string | null,
  promotionalFiles: File[]
) {
  const router = useRouter()

  const processPromotionalMaterials = async (savedEventId: string) => {
    // Implementação simplificada para reduzir complexidade
    if (promotionalFiles.length === 0) {
      return true
    }
    // TODO: Implementar upload de materiais promocionais
    console.log(`Processando ${promotionalFiles.length} materiais para evento ${savedEventId}`)
    return true
  }

  const handleSubmissionSuccess = (title: string) => {
    toast({
      title: `Evento ${isEditMode ? 'Atualizado' : 'Criado'}!`,
      description: `O evento "${title}" foi salvo com sucesso.`,
    })
    router.push('/app/organizador/eventos')
  }

  const handleSubmissionError = (error: any) => {
    console.error("Erro inesperado durante o upsert:", error)
    let errorMessage = "Ocorreu um erro inesperado ao processar a operação."
    if (error instanceof Error && error.message) {
      errorMessage = error.message
    }
    toast({ title: "Erro Inesperado", description: errorMessage, variant: "destructive" })
  }

  return {
    processPromotionalMaterials,
    handleSubmissionSuccess,
    handleSubmissionError
  }
}

