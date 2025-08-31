"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

// Types removidos - não utilizados no dashboard simplificado

// Hook customizado para dados do dashboard (Complexidade: 8 pontos)
function useDashboardData() {
  const [kpis, setKpis] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    teamsCount: 0,
    promotersCount: 0
  })
  const [teams, setTeams] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<{ first_name: string; last_name: string } | null>(null)
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [loadingProfile, setLoadingProfile] = useState(true)
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
      console.error('Erro ao verificar existência de tabela:', e)
      return false
    }
  }, [supabase, tableCache])

  // Função para verificar se coluna existe (Complexidade: 3 pontos)
  const checkColumnExists = async (tableName: string, columnName: string) => {
    try {
      const tableExists = await checkTableExists(tableName)
      if (!tableExists) return false
      
      // Usar select direto em vez de run_sql_query (que não existe)
      const { error } = await supabase
        .from(tableName)
        .select(columnName)
        .limit(1)
        
      return !error || error.code !== '42703'
    } catch (e) {
      console.error('Erro ao verificar existência de coluna:', e)
      return false
    }
  }

  // Contar promotores nas equipas da organização (Complexidade: 4 pontos)
  const getPromotersCount = useCallback(async (organizationId: string): Promise<number> => {
    try {
      if (!organizationId) return 0

      const { data, error } = await supabase.rpc('count_organization_promoters', {
        org_id: organizationId
      })

      if (error) {
        console.warn('Erro ao contar promotores:', error.message)
        return 0
      }

      return data || 0
    } catch (error) {
      console.warn('Erro ao executar contagem de promotores:', error)
      return 0
    }
  }, [supabase])

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
        // organization_id existe em todas as tabelas principais, não precisa verificar
        query = query.eq('organization_id', organizationId)
      }
      
      if (orderColumn) {
        const hasOrderColumn = await checkColumnExists(tableName, orderColumn)
        if (hasOrderColumn) {
          query = query.order(orderColumn, { ascending: orderAscending })
        }
      }
      
      return await query.limit(limit)
    } catch (e) {
      console.error('Erro ao executar consulta segura:', e)
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

      // Contar promotores nas equipas da organização
      const promotersCount = await getPromotersCount(organizationId)

      setKpis({
        totalEvents: completedEvents + upcomingEvents,
        upcomingEvents,
        teamsCount,
        promotersCount
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

  // Carregar perfil do usuário (Complexidade: 3 pontos)
  const loadUserProfile = useCallback(async (userId: string) => {
    setLoadingProfile(true)
    
    try {
      if (!userId) {
        setUserProfile(null)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.warn('Erro ao carregar perfil:', error.message)
        setUserProfile(null)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Erro ao executar busca do perfil:', error)
      setUserProfile(null)
    } finally {
      setLoadingProfile(false)
    }
  }, [supabase])

  return {
    kpis,
    teams,
    activities,
    userProfile,
    loadingKpis,
    loadingTeams,
    loadingProfile,
    loadingError,
    loadKpis,
    loadTeams,
    loadActivities,
    loadUserProfile,
    setLoadingError
  }
}

// Componente principal (Complexidade: 5 pontos)
export default function OrganizadorDashboardPage() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  
  const [loading, setLoading] = useState(true)

  const {
    kpis,
    teams,
    activities,
    userProfile,
    loadingKpis,
    loadingTeams,
    loadingProfile,
    loadingError,
    loadKpis,
    loadTeams,
    loadActivities,
    loadUserProfile,
    setLoadingError
  } = useDashboardData()

  // Carregar dados da organização com useRef para evitar loop (Complexidade: 3 pontos)
  useEffect(() => {
    if (!user || !currentOrganization) {
      setLoading(false)
      setLoadingError(true)
      return
    }
    
    const loadData = async () => {
      try {
        const organizationId = currentOrganization.id
        
        loadKpis(organizationId)
        loadTeams(organizationId)
        loadActivities()
        loadUserProfile(user.id)
        
        setLoading(false)
      } catch (error) {
        console.error('OrganizadorDashboard: Erro ao carregar organização:', error)
        setLoading(false)
        setLoadingError(true)
      }
    }
    
    loadData()
  }, [user?.id, currentOrganization?.id])

  // Função de refresh para o botão (Complexidade: 1 ponto)
  const handleRefresh = () => {
    if (user && currentOrganization) {
      const organizationId = currentOrganization.id
      loadKpis(organizationId)
      loadTeams(organizationId)
      loadActivities()
      loadUserProfile(user.id)
    }
  }

  return (
    <DashboardContent
      kpis={kpis}
      teams={teams}
      userProfile={userProfile}
      loadingKpis={loadingKpis}
      loadingTeams={loadingTeams}
      loadingProfile={loadingProfile}
      loadingError={loadingError} 
      onRefresh={handleRefresh}
    />
  )
} 