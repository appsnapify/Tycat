"use client"

import { useRoleAuthorization } from './hooks/useRoleAuthorization'
import { useTeamCreation } from './hooks/useTeamCreation'
import { TeamCreationForm } from './components/TeamCreationForm'

// ✅ PÁGINA PRINCIPAL: Criar Equipe (Complexidade: 2 pontos)
export default function CriarEquipePage() {
  // ✅ HOOKS: Lógica extraída (Complexidade: 0 - delegada)
  useRoleAuthorization()
  const { loading, error, submitTeamCreation } = useTeamCreation()

  // ✅ FUNÇÃO: Handle form submission (Complexidade: 1 ponto)
  const handleTeamCreation = (teamName: string, teamDescription: string) => {
    submitTeamCreation(teamName, teamDescription)
  }
  
  // ✅ RENDERIZAÇÃO: Componente limpo (Complexidade: 1 ponto)
  return (
    <TeamCreationForm
      loading={loading}
      error={error}
      onSubmit={handleTeamCreation}
    />
  )
}