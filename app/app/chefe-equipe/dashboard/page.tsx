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
    const supabase = createClient();
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
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || isLoadingAuth) return; // Sai se não houver user ou auth ainda a carregar

      setLoading(true);
      setError(null);
      setDashboardInfo(null);

      try {
        // Obter o team_id dos metadados do utilizador
        const teamId = user.user_metadata?.team_id; 
        if (!teamId) {
          console.error("Dashboard Chefe: ID da equipa não encontrado nos metadados.");
          setError("Não foi possível identificar a sua equipa principal.");
          setLoading(false);
          return;
        }

        console.log(`Dashboard Chefe: Chamando RPC get_team_leader_dashboard_data para team_id: ${teamId}`);

        const supabase = createClient();
        const { data: rpcData, error: rpcError } = await supabase
          .rpc('get_team_leader_dashboard_data', { p_team_id: teamId });

        // LOG ADICIONADO PARA VER O RESULTADO BRUTO DA RPC
        console.log("Dashboard Chefe: Dados BRUTOS recebidos da RPC:", JSON.stringify(rpcData, null, 2));

        // Tratamento de erro aprimorado
        if (rpcError) {
          console.error("Dashboard Chefe: Erro ao chamar RPC:", rpcError);
          console.log("Detalhes completos do erro:", JSON.stringify(rpcError));
          
          if (rpcError.message && rpcError.message.includes('Permissão negada')) {
             setError("Acesso negado. Apenas o chefe de equipa pode ver este dashboard.");
          } else {
             setError(`Ocorreu um erro ao carregar os dados: ${rpcError.message || 'Erro desconhecido'}`);
          }
          setLoading(false);
          return;
        }

        // Verificar se os dados são válidos
        if (!rpcData) {
             console.warn("Dashboard Chefe: RPC retornou dados nulos ou indefinidos.");
             // Manter dashboardInfo como null ou definir um estado de erro mais específico?
             // Por agora, vamos manter null para que o !dashboardInfo check funcione.
             setError("Não foram recebidos dados do dashboard."); // Definir erro
             setDashboardInfo(null); 
        } else if (!Array.isArray(rpcData)) {
             console.error("Dashboard Chefe: Resposta da RPC não é um array:", rpcData);
             setError("Formato de dados inesperado recebido.");
             setDashboardInfo(null);
        } else if (rpcData.length === 0) {
             console.warn("Dashboard Chefe: RPC retornou um array vazio.");
             // Isso pode significar que a equipa não foi encontrada pela RPC?
             setError("Dados da equipa não encontrados.");
             setDashboardInfo(null);
        } else if (rpcData[0].error) { // Verificar erro *dentro* do primeiro objeto, se aplicável
             console.error("Dashboard Chefe: Erro retornado dentro da resposta RPC:", rpcData[0].error);
             setError(`Erro ao processar dados: ${rpcData[0].error}`);
             setDashboardInfo(null);
        } else {
            console.log("Dashboard Chefe: Definindo estado com o primeiro objeto da RPC:", rpcData[0]);
            // Definir o estado com o PRIMEIRO objeto do array
            setDashboardInfo(rpcData[0] as LeaderDashboardData); 
            setError(null); // Limpar erro se dados foram carregados com sucesso
        }

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
          <Card key={dashboardInfo.organization_id} className="max-w-xs border rounded-lg">
              <CardHeader className="pb-3 text-center">
                  <CardTitle className="text-lime-500 text-xl font-semibold">
                      {dashboardInfo.organization_name}
                  </CardTitle>
                  <CardDescription className="flex items-center justify-center pt-1 text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {dashboardInfo.active_event_count ?? 0} evento{dashboardInfo.active_event_count !== 1 ? 's' : ''} ativo{dashboardInfo.active_event_count !== 1 ? 's' : ''}
                  </CardDescription>
            </CardHeader>
              <CardFooter className="flex justify-center border-t pt-4">
                  <Link href={`/app/chefe-equipe/eventos?orgId=${dashboardInfo.organization_id}`} className="w-2/3 flex justify-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-lime-500 text-lime-500 hover:bg-lime-50 hover:text-lime-600"
                      > 
                          <Calendar className="h-4 w-4 mr-2" />
                          Ver eventos
                      </Button>
                  </Link>
              </CardFooter>
          </Card>
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