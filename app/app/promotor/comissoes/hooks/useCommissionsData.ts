import { useEffect } from 'react'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useCommissionsState } from './useCommissionsState'
import { useCommissionsAPI } from './useCommissionsAPI'
import { applyFiltersLogic } from '../utils/commissionUtils'

// ✅ HOOK PRINCIPAL ORQUESTRADOR (Complexidade: 4 pontos)
export const useCommissionsData = () => {
  const { user } = useAuth()
  const {
    loading, setLoading, commissions, setCommissions, filteredCommissions,
    setFilteredCommissions, filter, setFilter, teams, setTeams, totals,
    setTotals, clearFilters
  } = useCommissionsState()
  const { loadCommissions: apiLoadCommissions, loadTeams: apiLoadTeams } = useCommissionsAPI()

  useEffect(() => {
    if (user) { // +1
      loadCommissions()
      loadTeams()
    }
  }, [user])

  useEffect(() => {
    if (commissions.length > 0) { // +1
      const filtered = applyFiltersLogic(commissions, filter)
      setFilteredCommissions(filtered)
    }
  }, [filter, commissions])

  const loadCommissions = () => {
    if (user?.id) { // +1
      apiLoadCommissions(user.id, setLoading, setCommissions, setTotals)
    }
  }
  const loadTeams = () => {
    if (user?.id) { // +1
      apiLoadTeams(user.id, setTeams)
    }
  }

  return {
    loading, commissions, filteredCommissions, filter, setFilter,
    teams, totals, loadCommissions, clearFilters
  }
}