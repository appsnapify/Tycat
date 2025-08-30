import { useState } from 'react'
import { Commission, CommissionFilter, CommissionTotals } from '../types/Commission'

// ✅ HOOK DE ESTADO: useCommissionsState (Complexidade: 1 ponto)
export const useCommissionsState = () => {
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([])
  const [filter, setFilter] = useState<CommissionFilter>({
    status: 'all',
    team: 'all',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [totals, setTotals] = useState<CommissionTotals>({
    all: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    rejected: 0
  })
  const clearFilters = () => {
    setFilter({
      status: 'all',
      team: 'all',
      search: '',
      startDate: '',
      endDate: ''
    })
  }

  return {
    loading,
    setLoading,
    commissions,
    setCommissions,
    filteredCommissions,
    setFilteredCommissions,
    filter,
    setFilter,
    teams,
    setTeams,
    totals,
    setTotals,
    clearFilters
  }
}
