"use client"

import React, { useEffect, useState } from 'react'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { LogOut, Loader2, Building, AlertCircle, Calendar, Settings } from 'lucide-react'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TeamType, TeamMemberType } from '@/lib/database.types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart, TeamMembers, TeamHeader } from '@/components/dashboard'
import { TeamMembersList } from '@/components/dashboard/team-members-list'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Copy, Users } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link'
import Image from 'next/image'

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

// ✅ FUNÇÃO AUXILIAR 1: Validar usuário (Complexidade: 2)
function validateUserData(userData: any): { isValid: boolean; userId?: string; userRole?: string; teamId?: string } {
  if (!userData?.user) {
    console.log('Usuário não autenticado')
    return { isValid: false }
  }

  const userId = userData.user.id
  const userRole = normalizeRole(userData.user?.user_metadata?.role)
  const teamId = userData.user?.user_metadata?.team_id

  if (userRole !== 'chefe-equipe' || !teamId) {
    console.log('Usuário não é chefe de equipe ou não tem equipe atribuída')
    return { isValid: false }
  }

  return { isValid: true, userId, userRole, teamId }
}

// ✅ FUNÇÃO AUXILIAR 2: Carregar dados da equipe (Complexidade: 3)
async function fetchTeamData(supabase: any, teamId: string): Promise<any> {
  console.log(`[fetchTeamData] Tentando carregar equipe via RPC: get_team_details para teamId=${teamId}`);
  
  try {
    const teamResponse = await supabase.rpc('get_team_details', { team_id_param: teamId });
    console.log('[fetchTeamData] Resultado RPC get_team_details:', { data: !!teamResponse.data, error: teamResponse.error });
    
    if (teamResponse.error) throw new Error(`Erro RPC: ${teamResponse.error.message}`);
    return teamResponse;
  } catch (rpcError: any) {
    console.log('[fetchTeamData] Falha na RPC, tentando select direto:', rpcError.message);
    return await supabase.from('teams').select('*').eq('id', teamId).single();
  }
}

// ✅ FUNÇÃO AUXILIAR 3: Carregar membros da equipe (Complexidade: 3)
async function fetchTeamMembers(supabase: any, teamId: string, userId: string): Promise<any[]> {
  console.log(`[fetchTeamMembers] Tentando carregar membros via RPC para teamId=${teamId}`);
  
  try {
    const membersResponse = await supabase.rpc('get_team_members', { team_id_param: teamId });
    console.log('[fetchTeamMembers] Resultado RPC get_team_members:', { dataLength: membersResponse.data?.length, error: membersResponse.error });
    
    if (membersResponse.error) throw new Error(`Erro RPC: ${membersResponse.error.message}`);
    return membersResponse.data || [];
  } catch (membersRpcError: any) {
    console.log('[fetchTeamMembers] Falha na RPC, tentando alternativo:', membersRpcError.message);
    return await loadTeamMembersAlternative(teamId, userId);
  }
}

// ✅ FUNÇÃO AUXILIAR 4: Processar fallback com metadados (Complexidade: 2)
async function processMetadataFallback(userData: any, teamId: string, userId: string): Promise<{ teamData: any; members: any[] }> {
  console.log('[processMetadataFallback] Usando metadados como fallback');
  
  const metadataTeam = getTeamDetailsFromMetadata(userData);
  if (!metadataTeam) {
    throw new Error("Não foi possível obter dados da equipe de nenhuma fonte.");
  }
  
  console.log("[processMetadataFallback] Obtendo membros (alternativo)...");
  const members = await loadTeamMembersAlternative(teamId, userId);
  return { teamData: metadataTeam, members };
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 21 → 6)
async function loadTeamData(userData: any) {
  console.log("[loadTeamData] Iniciando...");
  
  // 1. Validar dados do usuário
  const validation = validateUserData(userData);
  if (!validation.isValid) {
    return { teamData: null, members: [] };
  }
  
  const { userId, teamId } = validation;
  console.log(`Carregando dados para usuário: ${userId}, equipe: ${teamId}`);

  try {
    const supabase = createClient();
    console.log("[loadTeamData] Cliente Supabase criado.");

    // 2. Carregar dados da equipe
    const teamResponse = await fetchTeamData(supabase, teamId!);
    
    if (teamResponse.error || !teamResponse.data) {
      return await processMetadataFallback(userData, teamId!, userId!);
    }
    
    const teamData = teamResponse.data;
    console.log('[loadTeamData] Dados da equipe carregados com sucesso:', teamData?.id);

    // 3. Carregar membros da equipe
    const members = await fetchTeamMembers(supabase, teamId!, userId!);
    console.log(`[loadTeamData] Total de membros carregados: ${members.length}`);
    
    return { teamData, members };

  } catch (error: any) {
    console.error('[loadTeamData] Erro CATCH GERAL:', error.message);
    return await processMetadataFallback(userData, teamId!, userId!);
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
    const supabase = createClient()
    
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

// (Se houver interfaces definidas para dados do dashboard, ajustá-las ou criar novas)
interface DashboardData {
  team_name?: string;
  organization_name?: string;
  organization_logo_url?: string;
  // Adicionar outros campos conforme necessário
}

// Interface para os dados retornados pela nova RPC
interface LeaderDashboardData {
  team_id: string;
  team_name?: string;
  organization_id?: string;
  organization_name?: string;
  organization_logo_url?: string;
  active_event_count?: number;
  // Adicione outros campos que a RPC retorna, se houver
}

export default function TeamLeaderDashboard() {
  const { user, isLoading: isLoadingAuth } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboardInfo, setDashboardInfo] = useState<LeaderDashboardData | null>(null)
  
  // Função auxiliar: Validar precondições (Complexidade: 1)
  const validatePreconditions = (): boolean => {
    return !(!user || isLoadingAuth);
  };

  // Função auxiliar: Obter team ID (Complexidade: 2)
  const getTeamId = (): string | null => {
    const teamId = user.user_metadata?.team_id;
    if (!teamId) {
      console.error("Dashboard Chefe: ID da equipa não encontrado nos metadados.");
      setError("Não foi possível identificar a sua equipa principal.");
      return null;
    }
    return teamId;
  };

  // Função auxiliar: Tratar erro RPC (Complexidade: 1)
  const handleRpcError = (rpcError: any): void => {
    console.error("Dashboard Chefe: Erro ao chamar RPC:", rpcError);
    
    const errorMessages = {
      permission: "Acesso negado. Apenas o chefe de equipa pode ver este dashboard.",
      default: `Ocorreu um erro ao carregar os dados: ${rpcError.message || 'Erro desconhecido'}`
    };
    
    const hasPermissionError = rpcError.message?.includes('Permissão negada');
    const messageKey = hasPermissionError ? 'permission' : 'default';
    setError(errorMessages[messageKey]);
  };

  // Função auxiliar: Validar dados RPC (Complexidade: 1)
  const validateRpcData = (rpcData: any): string | null => {
    const validationRules = [
      { condition: !rpcData, message: "Não foram recebidos dados do dashboard." },
      { condition: !Array.isArray(rpcData), message: "Formato de dados inesperado recebido." },
      { condition: rpcData?.length === 0, message: "Dados da equipa não encontrados." },
      { condition: rpcData?.[0]?.error, message: `Erro ao processar dados: ${rpcData[0]?.error}` }
    ];
    
    const failedRule = validationRules.find(rule => rule.condition);
    return failedRule?.message || null;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!validatePreconditions()) return;

      setLoading(true);
      setError(null);
      setDashboardInfo(null);

      try {
        const teamId = getTeamId();
        if (!teamId) {
          return;
        }

        const supabase = createClient();
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_team_leader_dashboard_data', { p_team_id: teamId });

        if (rpcError) {
          handleRpcError(rpcError);
          return;
        }

        const validationError = validateRpcData(rpcData);
        if (validationError) {
          console.warn("Dashboard Chefe: Validação falhou:", validationError);
          setError(validationError);
          setDashboardInfo(null);
          return;
        }

        // Sucesso - definir dados
        setDashboardInfo(rpcData[0] as LeaderDashboardData); 
        setError(null);

      } catch (err: any) {
        console.error("Dashboard Chefe: Erro GERAL no carregamento:", err);
        if (!error) { 
             setError("Falha ao carregar informações do dashboard.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
  }, [user, isLoadingAuth]); // Dependências corretas - removido supabase para evitar loops
  
  if (loading || isLoadingAuth) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[70vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mx-auto" />
        <p className="text-muted-foreground mt-4">A carregar dashboard...</p>
      </div>
    )
  }
  
  if (error) {
    return (
       <div className="container py-10">
        <Card className="border-destructive bg-destructive/10">
          <CardHeader className="flex flex-row items-center space-x-4">
             <AlertCircle className="h-8 w-8 text-destructive"/>
             <div>
                <CardTitle className="text-destructive">Erro ao Carregar</CardTitle>
                <CardDescription className="text-destructive/90">{error}</CardDescription>
             </div>
          </CardHeader>
        </Card>
      </div>
    )
  }
  
  if (!dashboardInfo) {
     // Este caso pode não ser necessário se tratarmos rpcData nulo como um estado válido
     return (
        <div className="container py-10">
             <p>Não foram encontrados dados para apresentar no dashboard.</p>
        </div>
      );
  }
  
  return (
    <div className="container pb-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Chefe de Equipa</h1>
      
      {/* Container para linha abaixo do título */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 border-b pb-4">
        {/* Mensagem de boas-vindas (já existente, apenas movida) */}
        <p className="text-muted-foreground">
          Bem-vindo{' '}
          <strong className="font-medium text-foreground">
            {`${user?.user_metadata?.first_name || user?.profile?.first_name || ''} ${user?.user_metadata?.last_name || user?.profile?.last_name || ''}`.trim() || 'Chefe'}
          </strong>!
        </p>
        
        {/* Nome da Equipa (Formatado) */}
        {dashboardInfo?.team_name && (
            <p className="text-sm text-muted-foreground">
                 {/* Label normal */}
                <span className="tracking-wide">EQUIPA:</span>{' '}
                 {/* Nome da equipa em maiúsculas e negrito */}
                <strong className="font-semibold uppercase text-foreground/90">
                    {dashboardInfo.team_name}
                </strong>
            </p>
        )}
      </div>
      
       <h2 className="text-2xl font-semibold tracking-tight pt-4">Organizações Associadas</h2>
      {dashboardInfo?.organization_id && dashboardInfo.organization_name ? (
          <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_25px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-3 relative overflow-hidden cursor-pointer transition-all duration-300">
            {/* Círculo com símbolo no canto */}
            <div className="w-20 h-20 bg-black rounded-full absolute -right-4 -top-6">
              <div className="absolute bottom-5 left-5">
                <Building className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Ícone principal */}
            <div className="w-10">
              <Building className="w-10 h-10 text-black" />
            </div>
            
            {/* Título */}
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">{dashboardInfo.organization_name}</h1>
            
            {/* Descrição */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
              {dashboardInfo.active_event_count ?? 0} evento{dashboardInfo.active_event_count !== 1 ? 's' : ''} ativo{dashboardInfo.active_event_count !== 1 ? 's' : ''}
            </p>

            {/* Botão de ação */}
            <div className="pt-2">
              <Link href={`/app/chefe-equipe/eventos?orgId=${dashboardInfo.organization_id}`} className="block">
                <button className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors">
                  <Calendar className="w-3 h-3" />
                  Ver eventos
                </button>
              </Link>
            </div>
          </div>
      ) : (
         <Card className="border-dashed bg-muted/50 max-w-xs">
             <CardContent className="p-6 text-center flex flex-col items-center justify-center min-h-[120px]">
                 <Building className="h-10 w-10 text-muted-foreground/60 mb-3" />
                 <h3 className="font-medium mb-1 text-muted-foreground">Sem Organização Associada</h3>
                 <p className="text-sm text-muted-foreground/80">
                    A sua equipa não está ligada a nenhuma organização.
                 </p>
            </CardContent>
         </Card>
      )}
    </div>
  )
} 