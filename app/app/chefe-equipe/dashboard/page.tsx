"use client"

import React, { useEffect, useState } from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { TeamType, TeamMemberType } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart, TeamMembers, TeamHeader } from '@/components/dashboard'
import { TeamMembersList } from '@/components/dashboard/team-members-list'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Copy, Users } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

// Função para normalizar papéis
function normalizeRole(role: string | null | undefined): string {
  if (!role) return 'desconhecido'
  
  const roleMap: Record<string, string> = {
    'promoter': 'promotor',
    'team-leader': 'chefe-equipe'
  }
  
  return roleMap[role.toLowerCase()] || role.toLowerCase()
}

// Função para obter detalhes da equipe a partir dos metadados do usuário
function getTeamDetailsFromMetadata(userData: any): TeamType | null {
  if (!userData || !userData.user || !userData.user.user_metadata) return null
  
  const metadata = userData.user.user_metadata
  if (!metadata.team_id) return null
  
  return {
    id: metadata.team_id,
    name: metadata.team_name || 'Minha Equipe',
    description: metadata.team_description || 'Equipe de promotores',
    team_code: metadata.team_code || 'CÓDIGO-INDISPONÍVEL',
    created_at: metadata.created_at || new Date().toISOString(),
    created_by: userData.user.id,
    member_count: metadata.member_count || 1
  }
}

// Função para carregar dados da equipe
async function loadTeamData(userData: any) {
  // Verificar se o usuário está autenticado
  if (!userData || !userData.user) {
    console.log('Usuário não autenticado')
    return { teamData: null, members: [] }
  }

  const userId = userData.user.id
  const userRole = normalizeRole(userData.user?.user_metadata?.role)
  const teamId = userData.user?.user_metadata?.team_id

  console.log(`Carregando dados para usuário: ${userId}, papel: ${userRole}, equipe: ${teamId}`)

  // Verificar se é um chefe de equipe com ID de equipe
  if (userRole !== 'chefe-equipe' || !teamId) {
    console.log('Usuário não é chefe de equipe ou não tem equipe atribuída')
    return { teamData: null, members: [] }
  }

  try {
    // Criar cliente Supabase
    const supabase = createClientComponentClient()

    // Tentar carregar dados da equipe
    let teamResponse: any = { data: null, error: null }
    try {
      console.log(`Tentando carregar equipe com ID: ${teamId}`)
      
      // Verificando se a função RPC existe
      try {
        // Primeiro tente usar a função RPC que é mais robusta
        teamResponse = await supabase.rpc('get_team_details', { team_id_param: teamId })
        console.log('Resultado da chamada RPC:', teamResponse)
        
        if (teamResponse.error) {
          console.log(`Erro ao carregar equipe via RPC: ${teamResponse.error.message}`)
          throw new Error(`Erro ao carregar equipe via RPC: ${teamResponse.error.message}`)
        }
      } catch (rpcError) {
        console.log('Erro na chamada RPC, tentando método direto:', rpcError)
        
        // Tentar carregar diretamente da tabela
        teamResponse = await supabase
          .from('teams')
          .select('*')
          .eq('id', teamId)
          .single()
        
        console.log('Resultado da busca direta na tabela teams:', teamResponse)
      }
      
      // Se ainda temos erro ou nenhum dado
      if (teamResponse.error || !teamResponse.data) {
        console.log('Também falhou ao carregar equipe diretamente:', teamResponse.error)
        
        // Usar dados dos metadados como fallback
        const metadataTeam = getTeamDetailsFromMetadata(userData)
        console.log('Usando dados de equipe dos metadados:', metadataTeam)
        
        if (!metadataTeam) {
          console.log('Não foi possível obter dados da equipe dos metadados')
          return { teamData: null, members: [] }
        }
        
        return { 
          teamData: metadataTeam, 
          members: await loadTeamMembersAlternative(teamId, userId)
        }
      }
      
      console.log('Dados da equipe carregados:', teamResponse.data)
    } catch (error) {
      console.error('Erro ao tentar carregar equipe:', error)
      
      // Fallback para metadados
      const metadataTeam = getTeamDetailsFromMetadata(userData)
      
      if (!metadataTeam) {
        console.error('Não foi possível obter dados da equipe')
        return { teamData: null, members: [] }
      }
      
      return {
        teamData: metadataTeam,
        members: await loadTeamMembersAlternative(teamId, userId)
      }
    }

    // Obter membros da equipe
    let members = []
    try {
      console.log(`Tentando carregar membros da equipe: ${teamId}`)
      
      // Verificar se a função RPC existe
      try {
        // Primeiro tente usar a função RPC
        const membersResponse = await supabase.rpc('get_team_members', { team_id_param: teamId })
        console.log('Resultado da chamada RPC para membros:', membersResponse)
        
        if (membersResponse.error) {
          throw new Error(`Erro ao carregar membros via RPC: ${membersResponse.error.message}`)
        }
        
        members = membersResponse.data || []
      } catch (membersRpcError) {
        console.log('Erro na chamada RPC para membros, tentando método direto:', membersRpcError)
        members = await loadTeamMembersAlternative(teamId, userId)
      }
      
      console.log(`${members.length} membros carregados`)
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
      members = await loadTeamMembersAlternative(teamId, userId)
    }

    return {
      teamData: teamResponse.data,
      members: members
    }
  } catch (error) {
    console.error('Erro ao carregar dados da equipe:', error)
    
    // Usar dados dos metadados como último recurso
    const metadataTeam = getTeamDetailsFromMetadata(userData)
    console.log('Usando dados de equipe dos metadados como último recurso:', metadataTeam)
    
    return { 
      teamData: metadataTeam, 
      members: await loadTeamMembersAlternative(teamId, userId) 
    }
  }
}

// Função alternativa para carregar membros da equipe contornando problemas de RLS
async function loadTeamMembersAlternative(teamId: string, userId: string) {
  if (!teamId || !userId) {
    console.log('ID de equipe ou usuário inválido para carregamento alternativo de membros')
    return []
  }

  try {
    console.log(`Tentando carregar membros alternativamente para equipe: ${teamId}`)
    const supabase = createClientComponentClient()
    
    // Tentar carregar diretamente da tabela
    try {
      const response = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          team_id,
          role,
          joined_at,
          profiles(id, email, full_name, avatar_url)
        `)
        .eq('team_id', teamId)
      
      console.log('Resultado da busca direta de team_members:', response)
      
      if (response.error) {
        throw new Error(`Erro ao carregar membros: ${response.error.message}`)
      }
      
      console.log(`${response.data?.length || 0} membros carregados alternativamente`)
      return response.data || []
    } catch (error) {
      console.error('Erro ao carregar membros via seleção direta:', error)
      
      // Tentativa simplificada
      const simpleResponse = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
      
      if (!simpleResponse.error && simpleResponse.data) {
        console.log(`${simpleResponse.data.length} membros carregados com seleção simplificada`)
        return simpleResponse.data
      }
      
      // Retornar pelo menos o usuário atual como membro
      console.log('Retornando apenas o usuário atual como membro')
      return [{
        id: 'self',
        user_id: userId,
        team_id: teamId,
        role: 'chefe-equipe',
        joined_at: new Date().toISOString(),
        profile: {
          id: userId,
          email: 'Sem dados',
          full_name: 'Líder da Equipe',
          avatar_url: null
        }
      }]
    }
  } catch (error) {
    console.error('Erro no método alternativo de carregamento de membros:', error)
    
    // Retornar pelo menos o usuário atual
    return [{
      id: 'self',
      user_id: userId,
      team_id: teamId,
      role: 'chefe-equipe',
      joined_at: new Date().toISOString(),
      profile: {
        id: userId,
        email: 'Sem dados',
        full_name: 'Líder da Equipe',
        avatar_url: null
      }
    }]
  }
}

export default function TeamLeaderDashboard() {
  const { user, status, checkIfTeamLeader } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
  const [team, setTeam] = useState<TeamType | null>(null)
  const [members, setMembers] = useState<TeamMemberType[]>([])
  const [loading, setLoading] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Função para carregar dados do dashboard
  async function loadDashboardData() {
    console.log('Iniciando carregamento do dashboard')
    setLoading(true)
    setLoadError(null)
    
    // Adicionar um timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      console.log('Timeout de segurança acionado')
      if (loading) {
        console.log('Dashboard ainda em carregamento após timeout, forçando conclusão')
        
        // Usar dados básicos dos metadados se disponíveis
        if (user?.user_metadata?.team_id && user?.user_metadata?.team_name) {
          const metadataTeam = getTeamDetailsFromMetadata({ user })
          console.log('Usando dados básicos dos metadados:', metadataTeam)
          
          if (metadataTeam) {
            setTeam(metadataTeam)
            // Definir membro padrão (próprio usuário)
            setMembers([{
              id: 'self',
              user_id: user.id,
              team_id: metadataTeam.id,
              role: 'chefe-equipe',
              joined_at: new Date().toISOString(),
              profile: {
                id: user.id,
                email: user.email || 'Sem dados',
                full_name: user.user_metadata?.full_name || 'Líder da Equipe',
                avatar_url: null
              }
            }])
          }
        }
        
        // Forçar saída do estado de carregamento
        setLoading(false)
      }
    }, 5000) // Reduzido para 5 segundos para mais rapidez
    
    try {
      // Verificar se o usuário está autenticado
      if (!user) {
        console.error('Usuário não autenticado')
        router.push('/login')
        clearTimeout(safetyTimeout)
        return
      }
      
      console.log('Carregando dashboard para usuário:', user.id)
      console.log('Metadados do usuário:', user.user_metadata)
      
      // Carregar dados usando a função robusta
      console.log('Chamando loadTeamData')
      const { teamData, members: teamMembers } = await loadTeamData({ user })
      console.log('Resposta de loadTeamData:', { teamDataReceived: !!teamData, membersCount: teamMembers?.length })
      
      if (!teamData) {
        console.error('Nenhum dado de equipe encontrado')
        setLoadError('Não foi possível carregar os dados da equipe. Verifique se você tem as permissões necessárias.')
        setLoading(false)
        clearTimeout(safetyTimeout)
        return
      }
      
      console.log('Dados da equipe carregados:', teamData)
      console.log('Membros carregados:', teamMembers)
      
      setTeam(teamData)
      setMembers(teamMembers)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
      setLoadError('Ocorreu um erro ao carregar o dashboard. Por favor, tente novamente.')
    } finally {
      console.log('Finalizando carregamento do dashboard')
      setLoading(false)
      clearTimeout(safetyTimeout)
    }
  }
  
  // Copiar código da equipe
  const copyTeamCode = () => {
    if (team?.team_code) {
      navigator.clipboard.writeText(team.team_code)
        .then(() => {
          setCopySuccess(true)
          toast.success('Código da equipe copiado!')
          setTimeout(() => setCopySuccess(false), 2000)
        })
        .catch(err => {
          console.error('Falha ao copiar:', err)
          toast.error('Não foi possível copiar o código')
        })
    }
  }
  
  useEffect(() => {
    console.log('Status da autenticação mudou:', status)
    
    if (status === 'authenticated') {
      loadDashboardData()
    } else if (status === 'unauthenticated') {
      console.log('Usuário não autenticado, redirecionando para login')
      router.push('/login')
    }
    
    // Efeito específico para lidar com redirecionamento após logout
    return () => {
      if (status === 'unauthenticated') {
        console.log('Componente desmontado com status não autenticado, forçando redirecionamento')
        router.push('/login')
      }
    }
  }, [status, router])
  
  // Renderização do estado de carregamento
  if (loading) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-gray-900 mx-auto" />
        <p className="text-muted-foreground mt-4">Carregando dashboard...</p>
      </div>
    )
  }
  
  // Renderização de erro
  if (loadError) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar dashboard</CardTitle>
            <CardDescription>
              {loadError}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadDashboardData()}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Renderização quando não há equipe
  if (!team) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma equipe encontrada</CardTitle>
            <CardDescription>
              Você precisa criar uma equipe para acessar o dashboard de chefe de equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/app/promotor/equipes/criar')}>
              Criar Equipe
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-10 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-muted-foreground mt-1">{team.description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/app/promotor/equipes/gerenciar')}
          >
            Gerenciar Equipe
          </Button>
        </div>
      </div>
      
      <Separator />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Código da Equipe</CardTitle>
            <CardDescription>
              Compartilhe este código com outros promotores para que eles entrem na sua equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-2">
              <Input
                readOnly
                value={team.team_code || 'Código não disponível'}
                className="font-mono text-center"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={copyTeamCode}
                className={copySuccess ? 'bg-green-100' : ''}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>
              {members.length === 1 
                ? '1 membro na equipe'
                : `${members.length} membros na equipe`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{members.length}</p>
                <p className="text-sm text-muted-foreground">Total de membros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            Lista de todos os promotores que fazem parte da sua equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMembersList 
            initialMembers={members} 
            teamId={team.id}
            fallbackUserId={user?.id} 
          />
        </CardContent>
      </Card>
    </div>
  )
} 