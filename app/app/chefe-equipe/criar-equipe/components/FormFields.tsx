import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface FormFieldsProps {
  teamName: string
  teamDescription: string
  onTeamNameChange: (value: string) => void
  onTeamDescriptionChange: (value: string) => void
}

// ✅ COMPONENTE: Form Fields (Complexidade: 1 ponto)
export const FormFields = ({ 
  teamName, 
  teamDescription, 
  onTeamNameChange, 
  onTeamDescriptionChange 
}: FormFieldsProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="team-name" className="required">
          Nome da Equipa
        </Label>
        <Input
          id="team-name"
          placeholder="Introduza o nome da sua equipa"
          value={teamName}
          onChange={(e) => onTeamNameChange(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Este nome será visível para organizadores e promotores.
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="team-description">
          Descrição
        </Label>
        <Textarea
          id="team-description"
          placeholder="Descrição sobre a sua equipa (opcional)"
          value={teamDescription}
          onChange={(e) => onTeamDescriptionChange(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Uma breve descrição ajuda a explicar o propósito da sua equipa.
        </p>
      </div>
    </div>
  )
}
