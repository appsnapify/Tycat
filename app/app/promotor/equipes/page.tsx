"use client"

/*
  ⚠️ IMPORTANTE: NÃO ALTERAR O REDIRECIONAMENTO NESTA PÁGINA! ⚠️
  
  Esta página é o ponto de entrada para promotores sem equipe.
  O middleware direciona promotores para esta página para que possam:
  1. Criar uma nova equipe (se tornando chefe-equipe)
  2. Ingressar em uma equipe existente
  
  O método useEffect com verificação de isTeamLeader redireciona
  automaticamente chefes de equipe para o dashboard correto.
*/

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Users, PlusCircle, Loader2, AlertCircle, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  team_code: string
  role: string
  is_simulated?: boolean
}

export default function EquipesPage() {
  const router = useRouter()
  const { user, isTeamLeader } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [simulatedTeams, setSimulatedTeams] = useState<Team[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  
  // Verificar se o usuário já é chefe de equipe e redirecionar 
  useEffect(() => {
    if (isTeamLeader) {
      console.log("Usuário já é chefe de equipe, redirecionando para o dashboard de chefe...");
      toast.info("Você já é chefe de equipe. Redirecionando para o dashboard de chefe.");
      
      // Usar setTimeout para evitar erro durante renderização
      setTimeout(() => {
        router.push('/app/chefe-equipe/dashboard');
      }, 100);
    }
  }, [isTeamLeader, router]);
  
  useEffect(() => {
    if (user) {
      loadTeams()
      loadSimulatedTeams()
    }
  }, [user])
  
  useEffect(() => {
    applyFilters()
  }, [teams, simulatedTeams, searchQuery])
  
  const loadTeams = async () => {
    try {
      // Carregar equipes do usuario atual (reais)
      console.log("Carregando equipes para o usuário:", user?.id);
      
      // Primeiro, tenta buscar equipes pela tabela team_members
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          role
        `)
        .eq('user_id', user?.id);
      
      if (memberError) {
        console.error('Erro ao carregar membros de equipes:', memberError);
      } else {
        console.log("Membros de equipes encontrados:", memberData);
      }
      
      // Buscar todas as equipes disponíveis (debug)
      const { data: allTeamsData, error: allTeamsError } = await supabase
        .from('teams')
        .select('*')
        .limit(20);
        
      if (allTeamsError) {
        console.error('Erro ao carregar todas as equipes:', allTeamsError);
      } else {
        console.log("Todas as equipes disponíveis (debug):", allTeamsData);
      }
      
      // Se encontrou membros, buscar as equipes correspondentes
      if (memberData && memberData.length > 0) {
        const teamIds = memberData.map(member => member.team_id);
        console.log("IDs de equipes para buscar:", teamIds);
        
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);
          
        if (teamsError) {
          console.error('Erro ao carregar equipes por IDs:', teamsError);
        } else {
          console.log("Equipes encontradas por IDs:", teamsData);
          
          // Processar dados usando setTimeout para evitar erro de atualização durante renderização
          if (teamsData && teamsData.length > 0) {
            setTimeout(() => {
              const formattedTeams = teamsData.map(team => {
                // Encontrar o papel do usuário nesta equipe
                const membership = memberData.find(m => m.team_id === team.id);
                
                return {
                  id: team.id,
                  name: team.name || 'Equipe sem nome',
                  description: team.description,
                  logo_url: team.logo_url,
                  team_code: team.team_code || 'CÓDIGO',
                  role: membership?.role || 'member'
                };
              });
              
              console.log("Equipes formatadas:", formattedTeams);
              setTeams(formattedTeams);
            }, 0);
          }
        }
      } else {
        console.log("Nenhuma associação de equipe encontrada para o usuário");
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
    } finally {
      // Usando setTimeout para evitar erro de atualização durante renderização
      setTimeout(() => {
        setLoading(false);
      }, 0);
    }
  };
  
  const loadSimulatedTeams = () => {
    try {
      // Carregar equipes simuladas do localStorage
      const simulatedTeamsData = JSON.parse(localStorage.getItem('simulated_teams') || '[]');
      const simulatedMemberships = JSON.parse(localStorage.getItem('simulated_team_members') || '[]');
      
      console.log("Dados de equipes simuladas:", simulatedTeamsData);
      console.log("Dados de membros simulados:", simulatedMemberships);
      
      // Filtrar apenas as equipes do usuário atual
      const userSimulatedTeams = simulatedTeamsData.filter((team: any) => {
        return simulatedMemberships.some((member: any) => 
          member.team_id === team.id && 
          member.user_id === user?.id
        );
      });
      
      // Adicionar informação de role para cada equipe simulada
      const teamsWithRoles = userSimulatedTeams.map((team: any) => {
        const membership = simulatedMemberships.find((m: any) => 
          m.team_id === team.id && 
          m.user_id === user?.id
        );
        
        return {
          ...team,
          role: membership?.role || 'member',
          is_simulated: true
        };
      });
      
      console.log("Equipes simuladas do usuário:", teamsWithRoles);
      
      // Atualizar estado usando setTimeout para evitar erro de atualização durante renderização
      setTimeout(() => {
        setSimulatedTeams(teamsWithRoles);
      }, 0);
    } catch (error) {
      console.error('Erro ao carregar equipes simuladas:', error);
    }
  };
  
  const applyFilters = () => {
    // Combinar equipes reais e simuladas
    const allTeams = [...teams, ...simulatedTeams];
    console.log("Aplicando filtros. Equipes reais:", teams.length, "Equipes simuladas:", simulatedTeams.length);
    
    // Aplicar filtro de busca
    const filtered = allTeams.filter(team => 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (team.description && team.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Usar setTimeout para evitar erro de atualização durante renderização
    setTimeout(() => {
      setFilteredTeams(filtered);
    }, 0);
  };
  
  const getTeamBadge = (role: string, isSimulated: boolean = false) => {
    if (isSimulated) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Simulação</Badge>
    }
    
    if (role === 'leader') {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Líder</Badge>
    }
    
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Membro</Badge>
  }
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Minhas Equipes</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-4">
                <Skeleton className="h-5 w-1/2 mb-1" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4">
                <Skeleton className="h-9 w-24" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Minhas Equipes</h1>
        
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/promotor/equipes/ingressar">
              <Users className="mr-2 h-4 w-4" />
              Ingressar
            </Link>
          </Button>
          
          <Button asChild>
            <Link href="/app/promotor/equipes/criar">
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar Equipe
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Pesquisar equipes..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {filteredTeams.length === 0 ? (
        <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma equipe encontrada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Você ainda não faz parte de nenhuma equipe. Crie sua própria equipe ou ingresse em uma equipe existente.
            </p>
            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link href="/app/promotor/equipes/ingressar">
                  <Users className="mr-2 h-4 w-4" />
                  Ingressar em uma equipe
                </Link>
              </Button>
              <Button asChild>
                <Link href="/app/promotor/equipes/criar">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar nova equipe
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  {getTeamBadge(team.role, team.is_simulated)}
                </div>
                <CardDescription>
                  {team.is_simulated ? 'Equipe simulada (apenas local)' : `Código: ${team.team_code}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {team.description || 'Sem descrição'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between border-t p-4">
                {team.role === 'leader' ? (
                  <Button 
                    onClick={() => router.push('/app/chefe-equipe/dashboard')}
                    variant="default"
                  >
                    Gerenciar Equipe
                  </Button>
                ) : (
                  <Button 
                    onClick={() => router.push('/app/promotor/dashboard')}
                    variant="outline"
                  >
                    Ver Detalhes
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {simulatedTeams.length > 0 && (
        <Alert className="mt-8 bg-purple-50 border-purple-200">
          <Info className="h-4 w-4 text-purple-700" />
          <AlertTitle>Modo Simulação Ativo</AlertTitle>
          <AlertDescription>
            Você tem equipes no modo simulação. Estes dados são armazenados apenas localmente no seu navegador.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
} 