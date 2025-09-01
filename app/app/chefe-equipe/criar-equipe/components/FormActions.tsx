import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface FormActionsProps {
  loading: boolean
  teamName: string
}

// ✅ COMPONENTE: Form Actions (Complexidade: 2 pontos)
export const FormActions = ({ loading, teamName }: FormActionsProps) => {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 border-t p-6">
      <Button 
        className="w-full"
        type="submit"
        disabled={loading || !teamName.trim()} // +1
      >
        {loading ? (                            // +1
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A criar...
          </>
        ) : (
          'Criar Equipa'
        )}
      </Button>
      
      <div className="text-center text-sm text-muted-foreground">
        <p>Ao criar uma equipa, você se tornará o líder oficial de equipe.</p>
        <Button 
          variant="link" 
          type="button"
          className="p-0 h-auto text-sm font-normal"
          onClick={() => router.push('/app/chefe-equipe/dashboard')}
        >
          Voltar para o dashboard
        </Button>
      </div>
    </div>
  )
}
