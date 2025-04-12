"use client"

import React, { useEffect, useState } from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogOut, Loader2, Building } from 'lucide-react'
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
  console.log("[loadTeamData] Iniciando...");
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
    const supabase = createClientComponentClient();
    console.log("[loadTeamData] Cliente Supabase criado.");

    let teamResponse: any = { data: null, error: null };
    try {
      console.log(`[loadTeamData] Tentando carregar equipe via RPC: get_team_details para teamId=${teamId}`);
      teamResponse = await supabase.rpc('get_team_details', { team_id_param: teamId });
      console.log('[loadTeamData] Resultado RPC get_team_details:', { data: !!teamResponse.data, error: teamResponse.error });
      
      if (teamResponse.error) throw new Error(`Erro RPC get_team_details: ${teamResponse.error.message}`);

    } catch (rpcError: any) {
      console.log('[loadTeamData] Falha na RPC get_team_details, tentando select direto:', rpcError.message);
      console.log(`[loadTeamData] Tentando carregar equipe via SELECT direto para teamId=${teamId}`);
      teamResponse = await supabase.from('teams').select('*').eq('id', teamId).single();
      console.log('[loadTeamData] Resultado SELECT direto teams:', { data: !!teamResponse.data, error: teamResponse.error });
    }
    
    if (teamResponse.error || !teamResponse.data) {
      console.log('[loadTeamData] Falha ao carregar dados da equipe via RPC e SELECT. Usando metadados.');
      const metadataTeam = getTeamDetailsFromMetadata(userData);
      if (!metadataTeam) throw new Error("Não foi possível obter dados da equipe de nenhuma fonte.");
      console.log("[loadTeamData] Obtendo membros (alternativo) para equipa dos metadados...");
      const members = await loadTeamMembersAlternative(teamId, userId);
      return { teamData: metadataTeam, members };
    }
      
    const teamData = teamResponse.data;
    console.log('[loadTeamData] Dados da equipe carregados com sucesso:', teamData?.id);

    // Obter membros da equipe
    let members = [];
    try {
      console.log(`[loadTeamData] Tentando carregar membros via RPC: get_team_members para teamId=${teamId}`);
      const membersResponse = await supabase.rpc('get_team_members', { team_id_param: teamId });
      console.log('[loadTeamData] Resultado RPC get_team_members:', { dataLength: membersResponse.data?.length, error: membersResponse.error });
      if (membersResponse.error) throw new Error(`Erro RPC get_team_members: ${membersResponse.error.message}`);
      members = membersResponse.data || [];

    } catch (membersRpcError: any) {
      console.log('[loadTeamData] Falha na RPC get_team_members, tentando alternativo:', membersRpcError.message);
      console.log("[loadTeamData] Obtendo membros (alternativo) após falha RPC...");
      members = await loadTeamMembersAlternative(teamId, userId);
    }
      
    console.log(`[loadTeamData] Total de membros carregados: ${members.length}`);
    return { teamData, members };

  } catch (error: any) {
    console.error('[loadTeamData] Erro CATCH GERAL:', error.message);
    // Tentar fallback final para metadados
    const metadataTeam = getTeamDetailsFromMetadata(userData);
    if (!metadataTeam) {
      console.error("[loadTeamData] Falha no fallback final para metadados.");
      throw error; // Relançar erro se nem metadados funcionarem
    }
    console.log("[loadTeamData] Usando metadados no CATCH GERAL. Obtendo membros (alternativo)...");
    const members = await loadTeamMembersAlternative(teamId, userId);
    return { teamData: metadataTeam, members };
  }
}

// Função alternativa para carregar membros da equipe contornando problemas de RLS
async function loadTeamMembersAlternative(teamId: string, userId: string) {
  console.log(`[loadTeamMembersAlternative] Iniciando para teamId=${teamId}`);
  if (!teamId || !userId) {
    console.log('ID de equipe ou usuário inválido para carregamento alternativo de membros')
    return []
  }

  try {
    console.log(`Tentando carregar membros alternativamente para equipe: ${teamId}`)
    const supabase = createClientComponentClient()
    
    // Tentar carregar diretamente da tabela
    try {
      console.log(`[loadTeamMembersAlternative] Tentando SELECT direto em team_members (com profiles)...`);
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
      
      console.log('[loadTeamMembersAlternative] Resultado SELECT direto (com profiles):', { dataLength: response.data?.length, error: response.error });
      
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
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [associatedOrganizations, setAssociatedOrganizations] = useState<Organization[]>([])
  
  // Função para carregar dados APENAS das organizações
  async function loadDashboardData() {
    console.log('Iniciando carregamento do dashboard (organizações)')
    setLoading(true)
    setLoadError(null)
    
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        setLoadError("Timeout ao carregar dados.")
        setLoading(false)
      }
    }, 8000) // Aumentar ligeiramente o timeout
    
    try {
      if (!user || !user.user_metadata?.team_id) {
        console.error('Usuário não autenticado ou sem team_id nos metadados')
        setLoadError('Informações da equipe não encontradas. Contacte o suporte.')
        setLoading(false)
        clearTimeout(safetyTimeout)
        return
      }
      
      const teamId = user.user_metadata.team_id
      console.log('Carregando dashboard para usuário:', user.id, ' Equipe ID:', teamId)
      
      // ---> BUSCAR ORGANIZAÇÕES ASSOCIADAS <--- 
      console.log(`Buscando organizações para a equipe: ${teamId}`);
      const { data: orgLinks, error: linkError } = await supabase
        .from('organization_teams')
        .select('organization_id')
        .eq('team_id', teamId); 
        
      if (linkError) {
        throw new Error(`Erro ao buscar links de organização: ${linkError.message}`);
      }
      
      if (orgLinks && orgLinks.length > 0) {
        const orgIds = orgLinks.map(link => link.organization_id);
        console.log(`Encontrados IDs de organização associados: ${orgIds.join(', ')}`);
        const { data: organizationsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, logotipo, address, location')
          .in('id', orgIds);
          
        if (orgsError) {
          throw new Error(`Erro ao buscar detalhes das organizações: ${orgsError.message}`);
        }
        console.log('Organizações associadas carregadas:', organizationsData);
        setAssociatedOrganizations(organizationsData || []);
      } else {
        console.log('Nenhuma organização encontrada associada a esta equipe.');
        setAssociatedOrganizations([]);
      }
      // ---> FIM BUSCA ORGANIZAÇÕES <--- 
      
    } catch (error: any) {
      console.error('Erro ao carregar dashboard:', error)
      setLoadError(error.message || 'Ocorreu um erro ao carregar o dashboard.')
    } finally {
      console.log('Finalizando carregamento do dashboard (organizações)')
      setLoading(false)
      clearTimeout(safetyTimeout)
    }
  }
  
  useEffect(() => {
    console.log('Auth state changed:', { isLoading, hasUser: !!user });
    if (isLoading) {
      console.log("Auth ainda está carregando...");
      return;
    }
    if (!isLoading && user) {
      console.log("Autenticado, carregando dados do dashboard...");
      loadDashboardData();
    }
    if (!isLoading && !user) {
      console.log('Usuário não autenticado após carregamento, redirecionando para login');
      router.push('/login');
    }
  }, [isLoading, user, router]);
  
  if (loading) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-gray-900 mx-auto" />
        <p className="text-muted-foreground mt-4">Carregando dashboard...</p>
      </div>
    )
  }
  
  if (loadError) {
    return (
      <div className="container py-10">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar dashboard</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => loadDashboardData()}>Tentar novamente</Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard Chefe de Equipe</h1>
      
      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">Organizações Associadas</h2>
        {associatedOrganizations.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {associatedOrganizations.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col min-h-[150px]"
                onClick={() => alert(`Clicou na organização: ${org.name} (ID: ${org.id}) - Implementar Modal!`)}
              >
                <CardHeader className="p-5 flex flex-row items-center space-x-4">
                  {org.logotipo ? (
                    <img src={org.logotipo} alt={org.name || 'Logo'} className="h-12 w-12 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                      {(org.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <CardTitle className="text-xl font-semibold">{org.name || 'Organização Sem Nome'}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0 text-sm text-muted-foreground flex-grow">
                   {org.address && (
                     <p className="line-clamp-2">{org.address}</p>
                   )}
                   {!org.address && org.location && (
                     <p className="line-clamp-2">{org.location}</p>
                   )}
                   {!org.address && !org.location && (
                      <p><i>Localização não disponível</i></p>
                   )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-gray-300">
            <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[150px]">
              <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-medium mb-1">Sem Organizações Associadas</h3>
              <p className="text-sm text-muted-foreground">
                Sua equipe ainda não está associada a nenhuma organização.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 