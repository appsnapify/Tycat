import { useCommissionsLoader } from './useCommissionsLoader'
import { useTeamsLoader } from './useTeamsLoader'

// ✅ HOOK ORQUESTRADOR: useCommissionsAPI (Complexidade: 1 ponto)
export const useCommissionsAPI = () => {
  const { loadCommissions } = useCommissionsLoader()
  const { loadTeams } = useTeamsLoader()

  return {
    loadCommissions,
    loadTeams
  }
}