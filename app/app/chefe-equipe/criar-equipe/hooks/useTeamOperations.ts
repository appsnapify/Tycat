import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/app/_providers/auth-provider'

// ✅ HOOK: Team Database Operations (Complexidade: 4 pontos)
export const useTeamOperations = () => {
  const { user } = useAuth()

  // ✅ FUNÇÃO: Criar equipe (Complexidade: 2 pontos)
  const createTeam = async (teamName: string, teamDescription: string) => {
    console.log("Tentando criar equipa para o utilizador:", user?.id.substring(0, 8) + '...')
    
    const supabase = createClient()
    const { data: teamId, error: rpcError } = await supabase
      .rpc('create_promoter_team_v2', {
        user_id: user!.id,
        team_name: teamName.trim(),
        team_description: teamDescription.trim() || null
      })
      
    if (rpcError) {                           // +1
      throw new Error(`Erro ao criar equipe: ${rpcError.message}`)
    }
    
    if (!teamId) {                            // +1
      throw new Error('ID da equipe não foi retornado após a criação')
    }
    
    console.log("Equipe criada com sucesso:", teamId)
    return teamId
  }

  // ✅ FUNÇÃO: Atualizar metadados (Complexidade: 2 pontos)
  const updateUserMetadata = async (teamId: string) => {
    try {                                     // +1
      console.log("Atualizando metadados do usuário para chefe de equipe no Supabase")
      const supabase = createClient()
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          role: 'team-leader',
          previous_role: user?.user_metadata?.role || 'chefe-equipe',
          team_id: teamId,
          team_role: 'leader'
        }
      })
      
      if (metadataError) {                    // +1
        console.error("Erro ao atualizar metadados do usuário:", metadataError)
      } else {
        console.log("Metadados do usuário atualizados com sucesso no Supabase")
      }
    } catch (metadataUpdateError) {
      console.error("Exceção ao atualizar metadados do usuário:", metadataUpdateError)
    }
  }

  return {
    createTeam,
    updateUserMetadata
  }
}
