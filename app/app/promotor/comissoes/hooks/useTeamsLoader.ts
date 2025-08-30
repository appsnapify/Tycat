import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ✅ HOOK ESPECÍFICO: useTeamsLoader (Complexidade: 4 pontos)
export const useTeamsLoader = () => {
  const supabase = createClient()

  const loadTeams = async (
    userId: string,
    setTeams: (teams: {id: string, name: string}[]) => void
  ) => {
    try { // +1
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          teams (
            id,
            name
          )
        `)
        .eq('promoter_id', userId)

      if (error) { // +1
        console.error('Erro ao carregar equipas:', error)
        toast.error('Erro ao carregar equipas')
        return
      }

      if (data) { // +1
        const uniqueTeams: {id: string, name: string}[] = []
        data.forEach((item: any) => { // any necessário - dados do Supabase
          if (item.teams && !uniqueTeams.some(t => t.id === item.teams.id)) { // +1
            uniqueTeams.push({
              id: item.teams.id,
              name: item.teams.name
            })
          }
        })
        setTeams(uniqueTeams)
      }
    } catch (err) {
      console.error('Erro inesperado ao carregar equipas:', err)
      toast.error('Erro inesperado ao carregar equipas')
    }
  }

  return { loadTeams }
}
