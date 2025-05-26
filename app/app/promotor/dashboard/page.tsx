"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Users, Loader2, AlertCircle, ShieldCheck, LogIn, Building } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRouter } from 'next/navigation'

// Interface Atualizada
interface OrganizationInfo {
  id: string;
  name: string | null;
  logo_url: string | null;
}

interface Team {
  id: string;
  name: string;
  team_code?: string | null;
  organizations: OrganizationInfo[];
  role?: string;
}

export default function PromotorDashboardPage() {
  const { user, initialAuthCheckCompleted, supabase } = useAuth()
  
  // Estado Essencial
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([])
  
  // --- Lógica de Busca de Equipas (Simplificada) ---
  const loadTeams = async () => {
    console.log("DashboardPromotor: loadTeams iniciado");
    if (!user?.id) {
      console.warn("DashboardPromotor: loadTeams chamado sem user ID.");
      setError("Utilizador não autenticado.");
      setLoadingTeams(false);
      return;
    }
    setLoadingTeams(true);
    setError(null);
    setTeams([]); 

    try {
      // Buscar associação
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);

      if (memberError) throw new Error("Erro ao buscar suas associações de equipa.");
      if (!memberData || memberData.length === 0) {
        console.log("DashboardPromotor: Nenhuma associação de equipe encontrada.");
        setTeams([]);
        setLoadingTeams(false);
        return;
      }

      const teamIds = memberData.map(member => member.team_id);
      
      // Buscar detalhes das equipas e da organização associada
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_code,
          organizations ( id, name, logo_url )
        `)
        .in('id', teamIds);

      if (teamsError) throw new Error(`Erro ao carregar detalhes das equipas: ${teamsError.message}`);

      if (teamsData && teamsData.length > 0) {
        const formattedTeams = teamsData.map(team => {
          const membership = memberData.find(m => m.team_id === team.id);
          
          // Garantir que organizations é sempre um array
          let orgList: OrganizationInfo[] = [];
          if (Array.isArray(team.organizations)) {
             orgList = team.organizations as OrganizationInfo[];
          } else if (team.organizations) { // Caso retorne objeto único
             orgList = [team.organizations as OrganizationInfo];
          }

          return {
            id: team.id,
            name: team.name || 'Equipe sem nome',
            team_code: team.team_code,
            organizations: orgList.map(org => ({
                 id: org.id,
                 name: org.name || null,
                 logo_url: org.logo_url || null,
             })),
            role: membership?.role || 'member'
          };
        });

        setTeams(formattedTeams);
      } else {
        setTeams([]);
      }

    } catch (err: any) {
      console.error('DashboardPromotor: Erro geral ao carregar equipes:', err);
      setError(err.message || "Ocorreu um erro inesperado ao buscar suas equipas.");
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  // --- Use Effects --- 
  // 1. Carrega as equipas
  useEffect(() => {
    console.log(`DashboardPromotor useEffect: user: ${user ? user.id : 'null'}, initialAuthCheckCompleted: ${initialAuthCheckCompleted}`);
    if (initialAuthCheckCompleted && user?.id) {
      console.log("DashboardPromotor: Chamando loadTeams pois initialAuthCheckCompleted é true e user.id existe.");
      loadTeams();
    } else if (initialAuthCheckCompleted && !user?.id) {
      console.warn("DashboardPromotor: initialAuthCheckCompleted é true, mas não há user.id. Não carregando equipas.");
      setLoadingTeams(false);
      setError("Utilizador não autenticado ou sessão inválida."); // Poderia ser uma mensagem mais específica
      setTeams([]); 
    } else {
      console.log("DashboardPromotor: Aguardando initialAuthCheckCompleted ou user.id.");
      // Mantém o loading ativo se a verificação inicial ainda não ocorreu
      // ou se ainda não há utilizador.
      // Opcionalmente, adicionar um timeout para evitar loading infinito se algo correr mal no AuthProvider
      // mas por agora, vamos confiar que initialAuthCheckCompleted ficará true.
      // setLoadingTeams(true); // Já está true por defeito
    }
  }, [user, user?.id, initialAuthCheckCompleted]); // Adicionar user.id e initialAuthCheckCompleted às dependências

  // --- Render Logic ---
  const nomePromotor =
    `${user?.user_metadata?.first_name || user?.profile?.first_name || ''} ${user?.user_metadata?.last_name || user?.profile?.last_name || ''}`.trim() ||
    user?.email ||
    'Promotor';

  if (!initialAuthCheckCompleted && loadingTeams) { // Mostra loader enquanto o authProvider não completou a verificação inicial
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">A carregar os seus dados...</span>
      </div>
    );
  }
  
  if (error) { // Erro na busca de equipas
     return (
       <div className="container mx-auto p-4 md:p-8">
         <Alert variant="destructive">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Erro ao Carregar</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
       </div>
     );
  }
  
  if (!user) { // Segurança extra
      return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <p>Erro: Utilizador não autenticado. Por favor, faça login.</p>
          </div>
      );
  }

  // --- Renderização Principal Focada na Equipa --- 
  return (
    <div className="space-y-6">
      {/* Cabeçalho principal da página */}
      <div className="mb-6">
         <h1 className="text-2xl md:text-3xl font-bold">Dashboard Promotor</h1>
         <p className="text-muted-foreground mt-1">
             Bem-vindo <strong className="font-medium text-foreground">{nomePromotor}</strong>!
         </p>
      </div>
      
      {/* --- Secção da Equipa Associada --- */} 
      <div className="flex flex-col items-center"> {/* Centraliza o card na página */} 
        <h2 className="text-xl font-semibold tracking-tight mb-4 self-start">Equipa Associada</h2> {/* Mantém título alinhado à esquerda */} 
        {teams.length === 0 ? (
          // --- Estado Sem Equipas (Mantido, ligeiramente ajustado) --- 
          <Card className="border-dashed bg-muted/50 max-w-xs w-full"> {/* Mais pequeno e full width dentro do container flex */} 
            <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center"> {/* Centralizado e padding */} 
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <h3 className="text-base font-medium mb-1">Nenhuma equipa associada</h3>
              <p className="text-xs text-muted-foreground mb-4">
                Adira a uma equipa existente usando o código.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/app/promotor/equipes/ingressar">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Aderir
                </Link>
              </Button>
          </CardContent>
        </Card>
        ) : (
          // --- Estado Com Equipa (Card Compacto e Centrado) --- 
          <Card className="max-w-xs w-full overflow-hidden"> {/* Max width e full width */} 
            <CardContent className="p-4 flex flex-col items-center space-y-3"> {/* Padding, flex column, centralizado */} 
              {/* Nome da Equipa em Destaque */} 
              <p className="text-lg font-semibold text-lime-500 truncate"> 
                {teams[0].name}
              </p>
              {/* Código da Equipa */} 
              <div className="flex items-center text-xs text-muted-foreground">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" /> 
                <span>Código: {teams[0].team_code || 'N/A'}</span>
          </div>
               {/* Linha Separadora */}
              <hr className="my-2 w-full" /> {/* Separador a toda a largura */} 
               {/* Botão de Ação com Popup */}
              <Dialog>
                 <DialogTrigger asChild>
                   <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      <LogIn className="mr-1.5 h-3.5 w-3.5" /> {/* Ícone LogIn */}
                      Entrar {/* Texto do botão mantido */}
                    </Button>
                 </DialogTrigger>
                 <DialogContent className="sm:max-w-[425px] p-6">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-lg">Organizações Associadas</DialogTitle>
                      <DialogDescription>
                        Esta equipa pertence a estas organizações.
                      </DialogDescription>
                    </DialogHeader>
                    {/* Listagem de Organizações Clicáveis */} 
                    <div className="space-y-3 py-4"> {/* Espaçamento entre itens */} 
                       {(teams[0]?.organizations && teams[0].organizations.length > 0) ? (
                         teams[0].organizations.map((org) => (
                           <Link 
                             key={org.id} 
                             href={`/app/promotor/eventos?orgId=${org.id}`}
                             passHref
                             legacyBehavior={false} // Recomendado para App Router
                             className="block p-3 rounded-md hover:bg-muted transition-colors cursor-pointer" // Estilo do link clicável
                           >
                             <div className="flex items-center gap-3"> {/* Layout interno do item */} 
                               {/* Logo Condicional */} 
                               {org.logo_url ? (
                                 <Image
                                   src={org.logo_url}
                                   alt={`Logo de ${org.name || 'Organização'}`}
                                   width={32} // Tamanho menor para lista
                                   height={32}
                                   className="rounded-md object-cover flex-shrink-0"
                                 />
                               ) : (
                                 <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0"> {/* Placeholder */} 
                                   <Building className="w-5 h-5 text-muted-foreground" />
               </div>
                               )}
                               {/* Nome da Organização */} 
                               <p className="text-base font-medium leading-tight flex-grow truncate"> {/* Tamanho base, truncado */} 
                                 {org.name || 'Organização Sem Nome'}
                             </p>
                         </div>
                           </Link>
                         ))
                       ) : (
                         <p className="text-center text-muted-foreground py-4">
                           Nenhuma organização diretamente associada a esta equipa.
                         </p>
                       )}
        </div>
                 </DialogContent>
              </Dialog>
          </CardContent>
            {/* Remover CardFooter se não for necessário */}
        </Card>
        )}
      </div>
    </div>
  )
} 