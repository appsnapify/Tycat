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
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, PlusCircle, Loader2, AlertCircle, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"

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

  // Verificar se o usuário já é chefe de equipe e redirecionar
  useEffect(() => {
    // Apenas tenta redirecionar se isTeamLeader for explicitamente true
    if (isTeamLeader === true) {
      console.log("EquipesPage: Usuário já é chefe de equipe, redirecionando...");
      toast.info("Você já é chefe de equipe. Redirecionando...");
      // Usar setTimeout para garantir que a navegação ocorra após a renderização inicial
      const timer = setTimeout(() => {
        router.push('/app/chefe-equipe/dashboard');
      }, 50); // Pequeno delay
      return () => clearTimeout(timer); // Limpar timeout se o componente desmontar
    }
    // Se isTeamLeader for false ou undefined, não faz nada aqui
  }, [isTeamLeader, router]);

  // Carregar dados apenas se o usuário existir e não for líder (evita trabalho desnecessário)
   useEffect(() => {
    if (user && isTeamLeader === false) {
      console.log("EquipesPage: User existe e não é líder. Carregando dados...");
      loadTeams();
      loadSimulatedTeams();
    } else if (!user) {
      console.log("EquipesPage: User não encontrado. Parando loading.");
      setLoading(false);
    } else if (isTeamLeader === true) {
       console.log("EquipesPage: User é líder. Loading será tratado pelo redirect.");
       // Mantém loading=true até o redirect acontecer para mostrar o indicador
    } else {
       // Caso onde user existe mas isTeamLeader ainda é undefined/null (a verificar)
       console.log("EquipesPage: Aguardando definição final de isTeamLeader...");
       // Mantém loading=true
    }
  }, [user, isTeamLeader]); // Depende de user e do estado de isTeamLeader

  const loadTeams = async () => {
    if (!user?.id) {
        console.log("EquipesPage: loadTeams chamado sem user ID.");
        setLoading(false); // Parar loading se não há user
        return;
    }
    setLoading(true);
    try {
      console.log("EquipesPage: Carregando equipes para o usuário:", user.id);

      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select(`
          id,
          team_id,
          role
        `)
        .eq('user_id', user.id);

      if (memberError) {
        console.error('EquipesPage: Erro ao carregar membros de equipes:', memberError);
        toast.error("Erro ao buscar suas equipes.");
        setTeams([]); // Limpa equipas em caso de erro
      } else if (memberData && memberData.length > 0) {
        console.log("EquipesPage: Membros de equipes encontrados:", memberData);
        const teamIds = memberData.map(member => member.team_id);
        console.log("EquipesPage: IDs de equipes para buscar:", teamIds);

        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .in('id', teamIds);

        if (teamsError) {
          console.error('EquipesPage: Erro ao carregar equipes por IDs:', teamsError);
          toast.error("Erro ao carregar detalhes das equipes.");
          setTeams([]);
        } else if (teamsData && teamsData.length > 0) {
          console.log("EquipesPage: Equipes encontradas por IDs:", teamsData);
          const formattedTeams = teamsData.map(team => {
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
          console.log("EquipesPage: Equipes formatadas:", formattedTeams);
          setTeams(formattedTeams);
        } else {
           console.log("EquipesPage: Nenhuma equipe encontrada para os IDs de membro.");
           setTeams([]);
        }
      } else {
        console.log("EquipesPage: Nenhuma associação de equipe encontrada para o usuário no DB.");
        setTeams([]);
      }
    } catch (error) {
      console.error('EquipesPage: Erro geral ao carregar equipes:', error);
      toast.error("Ocorreu um erro inesperado ao buscar suas equipes.");
       setTeams([]); // Limpa em caso de erro geral
    } finally {
      // Usar setTimeout para garantir que o estado de loading
      // só atualiza após potenciais redirects ou atualizações de estado síncronas
      setTimeout(() => setLoading(false), 0);
    }
  };

  const loadSimulatedTeams = () => {
     try {
      const simulatedTeamsData = JSON.parse(localStorage.getItem('simulated_teams') || '[]');
      const simulatedMemberships = JSON.parse(localStorage.getItem('simulated_team_members') || '[]');
      if (!user?.id) return; // Não carregar se não houver user
      const userSimulatedTeams = simulatedTeamsData.filter((team: any) =>
        simulatedMemberships.some((member: any) => member.team_id === team.id && member.user_id === user.id));
      const teamsWithRoles = userSimulatedTeams.map((team: any) => {
        const membership = simulatedMemberships.find((m: any) => m.team_id === team.id && m.user_id === user.id);
        return { ...team, role: membership?.role || 'member', is_simulated: true };
      });
      setSimulatedTeams(teamsWithRoles);
    } catch (error) {
      console.error('EquipesPage: Erro ao carregar equipes simuladas:', error);
       setSimulatedTeams([]); // Limpa em caso de erro
    }
  };

  const getTeamBadge = (role: string, isSimulated: boolean = false) => {
     if (isSimulated) {
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Simulação</Badge>
    }
    // Considerar 'chefe-equipe' também como líder
    if (role === 'leader' || role === 'chefe-equipe') {
      return <Badge variant="outline" className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200">Líder</Badge>
    }
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Membro</Badge>
  }

 // Indicador de loading/redirecionamento enquanto isTeamLeader não está definido ou é true
  if (loading || isTeamLeader === undefined || isTeamLeader === null || isTeamLeader === true) {
    return (
      <div className="flex items-center justify-center h-screen">
           <Loader2 className="h-8 w-8 animate-spin text-fuchsia-500" />
           <span className="ml-2">
               {isTeamLeader === true ? "Redirecionando..." : "A carregar dados..."}
           </span>
      </div>
    );
  }

  // Se chegou aqui, user existe, não é líder (isTeamLeader === false) e loading terminou
  const allTeams = [...teams, ...simulatedTeams];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Gestão de Equipas</h1>

        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/app/promotor/equipes/ingressar">
              <Users className="mr-2 h-4 w-4" />
              Aderir
            </Link>
          </Button>
        </div>
      </div>

      {allTeams.length === 0 ? (
         <Card className="border-dashed bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-10">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma equipa encontrada</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Ainda não faz parte de nenhuma equipa. Crie a sua própria equipa ou adira a uma equipa existente usando o código fornecido pelo líder.
            </p>
            <div className="flex gap-4">
              <Button asChild variant="outline">
                <Link href="/app/promotor/equipes/ingressar">
                  <Users className="mr-2 h-4 w-4" />
                  Aderir a uma equipa
                </Link>
              </Button>
              <Button asChild>
                <Link href="/app/promotor/equipes/criar">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar nova equipa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {allTeams.map((team) => (
            <Card key={team.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                  {getTeamBadge(team.role, team.is_simulated)}
                </div>
                <CardDescription>
                  {team.is_simulated ? 'Equipe simulada (apenas local)' : `Código: ${team.team_code || 'N/A'}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-2">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {team.description || 'Sem descrição'}
                </p>
              </CardContent>
              <CardFooter className="flex justify-end border-t p-4">
                  <Button
                    onClick={() => router.push('/app/promotor/dashboard')}
                    variant="outline"
                    size="sm"
                  >
                    Ver Dashboard
                  </Button>
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
 