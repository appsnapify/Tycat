"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

// Types
interface Team {
  id: string
  name: string
  members_count: number
}

interface Activity {
  type: string
  title: string
  description: string
  timestamp: string
}

// Hook customizado para dados do dashboard (Complexidade: 8 pontos)
function useDashboardData() {
  const [kpis, setKpis] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    teamsCount: 0,
    promotersCount: 0
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingError, setLoadingError] = useState(false)

  const supabase = createClient()
  const [tableCache] = useState(() => new Map<string, boolean>())

  // Função para verificar se tabela existe (Complexidade: 3 pontos)
  const checkTableExists = useCallback(async (tableName: string) => {
    if (tableCache.has(tableName)) {
      return tableCache.get(tableName)!
    }

    try {
      const { error } = await supabase.from(tableName).select('*').limit(0)
      const exists = !error || error.code !== '42P01'
      tableCache.set(tableName, exists)
      return exists
    } catch (e) {
      console.error(`Erro ao verificar tabela ${tableName}:`, e)
      return false
    }
  }, [supabase, tableCache])

  // Função para verificar se coluna existe (Complexidade: 4 pontos)
  const checkColumnExists = async (tableName: string, columnName: string) => {
    try {
      const tableExists = await checkTableExists(tableName)
      if (!tableExists) return false
      
      const query = `select ${columnName} from ${tableName} limit 0`
      const { error } = await supabase.rpc('run_sql_query', { query })
        
      if (error?.code === '42703') return false
      return !error
    } catch (e) {
      console.error(`Exceção ao verificar coluna '${columnName}':`, e)
      return false
    }
  }

  // Query segura (Complexidade: 8 pontos)
  const safeQuery = async (tableName: string, options: any = {}) => {
    const { 
      organizationId = null,
      select = '*',
      limit = 5,
      orderColumn = null,
      orderAscending = true
    } = options
    
    try {
      const tableExists = await checkTableExists(tableName)
      if (!tableExists) {
        return { data: [], error: { code: '42P01', message: 'Tabela não existe' } }
      }
      
      let query = supabase.from(tableName).select(select)
      
      if (organizationId) {
        const hasOrgColumn = await checkColumnExists(tableName, 'organization_id')
        if (hasOrgColumn) {
          query = query.eq('organization_id', organizationId)
        }
      }
      
      if (orderColumn) {
        const hasOrderColumn = await checkColumnExists(tableName, orderColumn)
        if (hasOrderColumn) {
          query = query.order(orderColumn, { ascending: orderAscending })
        }
      }
      
      return await query.limit(limit)
    } catch (e) {
      console.error(`Exceção em safeQuery para '${tableName}':`, e)
      return { data: [], error: e }
    }
  }

  // Carregar KPIs (Complexidade: 6 pontos)
  const loadKpis = useCallback(async (organizationId: string) => {
    setLoadingKpis(true)
    
    try {
      if (!organizationId) {
        setKpis({ totalEvents: 0, upcomingEvents: 0, teamsCount: 0, promotersCount: 0 })
        return
      }
      
      let completedEvents = 0
      let upcomingEvents = 0
      
      const eventsTableExists = await checkTableExists('events')
      
      if (eventsTableExists) {
        const eventsResponse = await supabase
          .from('events')
          .select('id, date')
          .eq('organization_id', organizationId)
          
        if (!eventsResponse.error && eventsResponse.data) {
          const now = new Date()
          eventsResponse.data.forEach(event => {
            const eventDate = new Date(event.date)
            if (eventDate < now) {
              completedEvents++
            } else {
              upcomingEvents++
            }
          })
        }
      }

      const teamsResponse = await safeQuery('teams', {
        organizationId,
        select: 'id',
        limit: 1000
      })
      
      const teamsCount = teamsResponse.data?.length ?? 0

      setKpis({
        totalEvents: completedEvents + upcomingEvents,
        upcomingEvents,
        teamsCount,
        promotersCount: 0
      })
      
    } catch (error) {
      console.error('Erro ao carregar KPIs:', error)
    } finally {
      setLoadingKpis(false)
    }
  }, [supabase, checkTableExists, safeQuery])

  // Carregar equipes (Complexidade: 4 pontos)
  const loadTeams = useCallback(async (organizationId: string) => {
    setLoadingTeams(true)
    
    try {
      const teamsResponse = await safeQuery('teams', {
        organizationId,
        select: 'id, name',
        limit: 10,
        orderColumn: 'name',
        orderAscending: true
      })
      
      if (teamsResponse.data) {
        const teamsWithCounts = teamsResponse.data.map((team: any) => ({
          id: team.id,
          name: team.name,
          members_count: 0
        }))
        
        setTeams(teamsWithCounts)
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
    } finally {
      setLoadingTeams(false)
    }
  }, [safeQuery])

  // Carregar atividades (Complexidade: 2 pontos)
  const loadActivities = useCallback(async () => {
    try {
      setActivities([
        {
          type: 'guest',
          title: 'Novo convidado registrado',
          description: 'Um novo convidado se registrou para o evento',
          timestamp: new Date().toISOString()
        }
      ])
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    }
  }, [])

  return {
    kpis,
    teams,
    activities,
    loadingKpis,
    loadingTeams,
    loadingError,
    loadKpis,
    loadTeams,
    loadActivities,
    setLoadingError
  }
}

// Componente principal (Complexidade: 5 pontos)
export default function OrganizadorDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  
  const [loading, setLoading] = useState(true)
  const [organizationCode, setOrganizationCode] = useState<string | null>(null)

  const {
    kpis,
    teams,
    activities,
    loadingKpis,
    loadingTeams,
    loadingError,
    loadKpis,
    loadTeams,
    loadActivities,
    setLoadingError
  } = useDashboardData()

  // Carregar dados da organização (Complexidade: 4 pontos)
  const loadOrganizationAndData = useCallback(async () => {
    if (!user) return
    
    try {
      if (currentOrganization) {
        const organizationId = currentOrganization.id
        
        generateOrganizationCode(organizationId)
        
        loadKpis(organizationId)
        loadTeams(organizationId)
        loadActivities()
        
        setLoading(false)
        return
      }

      setLoading(false)
      setLoadingError(true)
      
    } catch (error) {
      console.error('OrganizadorDashboard: Erro ao carregar organização:', error)
      setLoading(false)
      setLoadingError(true)
    }
  }, [user, currentOrganization, loadKpis, loadTeams, loadActivities])

  useEffect(() => {
    if (user && currentOrganization) {
      loadOrganizationAndData()
    }
  }, [user, currentOrganization, loadOrganizationAndData])
  
  // Gerar código da organização (Complexidade: 1 ponto)
  const generateOrganizationCode = (organizationId: string) => {
    const generatedOrgCode = `ORG-${organizationId.substring(0, 6).toUpperCase()}`
    setOrganizationCode(generatedOrgCode)
  }

  return (
    <DashboardContent
      kpis={kpis}
      teams={teams}
      loadingKpis={loadingKpis}
      loadingTeams={loadingTeams}
      loadingError={loadingError} 
      onRefresh={loadOrganizationAndData}
    />
  )
}