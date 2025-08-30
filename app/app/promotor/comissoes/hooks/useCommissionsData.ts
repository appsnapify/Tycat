import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { toast } from 'sonner'
import { Commission, CommissionFilter, CommissionTotals } from '../types/Commission'

// ✅ HOOK PERSONALIZADO: useCommissionsData (Complexidade: 8 pontos)
export const useCommissionsData = () => {
  const { user } = useAuth()
  const supabase = createClient()
  
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

  const loadCommissions = async () => {
    setLoading(true)
    try { // +1
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          id,
          amount,
          promoter_amount,
          team_amount,
          status,
          created_at,
          ticket_id,
          event_id,
          events:event_id (name),
          team_id,
          teams:team_id (name),
          organization_id,
          organizations:organization_id (name),
          payments:commission_payment_items (
            payment:payment_id (
              payment_date,
              receipt_code
            )
          )
        `)
        .eq('promoter_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error // +1
      
      if (data) { // +1
        const formattedCommissions: Commission[] = data.map(item => ({
          id: item.id,
          eventId: item.event_id,
          eventName: item.events?.name || 'Evento',
          organizationId: item.organization_id,
          organizationName: item.organizations?.name || 'Organização',
          teamId: item.team_id,
          teamName: item.teams?.name || 'Equipe',
          promoterId: user?.id || '',
          amount: item.amount || 0,
          promoterAmount: item.promoter_amount || 0,
          teamAmount: item.team_amount || 0,
          status: item.status || 'pending',
          ticketId: item.ticket_id,
          createdAt: item.created_at,
          paymentDate: item.payments?.[0]?.payment?.payment_date,
          receiptCode: item.payments?.[0]?.payment?.receipt_code
        }))
        
        setCommissions(formattedCommissions)
        const newTotals = calculateTotalsLogic(formattedCommissions)
        setTotals(newTotals)
        setFilteredCommissions(formattedCommissions)
      }
    } catch (error) { // +1
      console.error('Erro ao carregar comissões:', error)
      toast.error('Erro ao carregar as comissões')
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    try { // +1
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          teams:team_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
      
      if (error) throw error // +1
      
      if (data) { // +1
        const uniqueTeams = data.reduce((acc: {id: string, name: string}[], item) => {
          if (item.teams && !acc.some(t => t.id === item.teams.id)) {
            acc.push({
              id: item.teams.id,
              name: item.teams.name
            })
          }
          return acc
        }, [])
        
        setTeams(uniqueTeams)
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
    }
  }

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
    commissions,
    filteredCommissions,
    filter,
    setFilter,
    teams,
    totals,
    loadCommissions,
    clearFilters
  }
}

// ✅ FUNÇÃO AUXILIAR: calculateTotalsLogic (Complexidade: 5 pontos)
const calculateTotalsLogic = (commissions: Commission[]) => {
  const newTotals = {
    all: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    rejected: 0
  }
  
  commissions.forEach(commission => {
    newTotals.all += commission.promoterAmount
    
    if (commission.status === 'pending') { // +1
      newTotals.pending += commission.promoterAmount
    } else if (commission.status === 'processing') { // +1
      newTotals.processing += commission.promoterAmount
    } else if (commission.status === 'paid') { // +1
      newTotals.paid += commission.promoterAmount
    } else if (commission.status === 'rejected') { // +1
      newTotals.rejected += commission.promoterAmount
    }
  })
  
  return newTotals
}

// ✅ FUNÇÃO AUXILIAR: applyFiltersLogic (Complexidade: 8 pontos)
const applyFiltersLogic = (commissions: Commission[], filter: CommissionFilter) => {
  let filtered = [...commissions]
  
  if (filter.status !== 'all') { // +1
    filtered = filtered.filter(commission => commission.status === filter.status)
  }
  
  if (filter.team !== 'all') { // +1
    filtered = filtered.filter(commission => commission.teamId === filter.team)
  }
  
  if (filter.search) { // +1
    const searchLower = filter.search.toLowerCase()
    filtered = filtered.filter(commission => 
      commission.eventName.toLowerCase().includes(searchLower) ||
      commission.organizationName.toLowerCase().includes(searchLower) ||
      commission.receiptCode?.toLowerCase().includes(searchLower)
    )
  }
  
  if (filter.startDate) { // +1
    const startDate = new Date(filter.startDate)
    filtered = filtered.filter(commission => {
      const commissionDate = new Date(commission.createdAt)
      return commissionDate >= startDate
    })
  }
  
  if (filter.endDate) { // +1
    const endDate = new Date(filter.endDate)
    endDate.setHours(23, 59, 59, 999)
    filtered = filtered.filter(commission => {
      const commissionDate = new Date(commission.createdAt)
      return commissionDate <= endDate
    })
  }
  
  return filtered
}
