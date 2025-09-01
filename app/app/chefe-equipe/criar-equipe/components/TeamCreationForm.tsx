import { useState } from 'react'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import Link from 'next/link'
import { FormFields } from './FormFields'
import { FormActions } from './FormActions'

interface TeamCreationFormProps {
  loading: boolean
  error: string
  onSubmit: (teamName: string, teamDescription: string) => void
}

// ✅ COMPONENTE: Team Creation Form (Complexidade: 2 pontos)
export const TeamCreationForm = ({ loading, error, onSubmit }: TeamCreationFormProps) => {
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')

  // ✅ FUNÇÃO: Handle form submit (Complexidade: 1 ponto)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(teamName, teamDescription)
  }

  return (
    <div className="container max-w-2xl py-8">
      <Link href="/app/chefe-equipe/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para o painel
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Equipa</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar a sua própria equipa de promotores.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <FormFields
              teamName={teamName}
              teamDescription={teamDescription}
              onTeamNameChange={setTeamName}
              onTeamDescriptionChange={setTeamDescription}
            />
            
            {error && (                               // +1
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          
          <CardFooter>
            <FormActions loading={loading} teamName={teamName} />
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
