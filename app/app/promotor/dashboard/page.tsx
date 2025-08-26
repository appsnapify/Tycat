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
import PromoterPublicLinkCard from './PromoterPublicLinkCard'

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
  role: string;
}


export default function PromotorDashboardPage() {
  const { user, initialAuthCheckCompleted, supabase } = useAuth()
  
  // Estado Essencial
  const [loadingTeams, setLoadingTeams] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([])
  const [promoterName, setPromoterName] = useState<string>('')
  
  // --- Buscar nome do promotor ---
  const loadPromoterName = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();
        
      if (data) {
        const fullName = `${data.first_name || ''} ${data.last_name || ''}`.trim();
        setPromoterName(fullName || user.email || 'Promotor');
      }
    } catch (error) {
      setPromoterName(user.email || 'Promotor');
    }
  };
  
  // --- Lógica de Busca de Equipas (Simplificada) ---
  const loadTeams = async () => {
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

      if (memberError) {
        console.error("DashboardPromotor: Erro ao buscar team_members:", memberError);
        setError("Erro ao buscar associações de equipa.");
        return;
      }

      if (!memberData || memberData.length === 0) {
        console.log("DashboardPromotor: Utilizador não tem equipas associadas.");
        setTeams([]);
        return;
      }

      // Buscar detalhes das equipas e organizações
      const teamsWithOrgs = await Promise.all(
        memberData.map(async (membership) => {
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, team_code')
            .eq('id', membership.team_id)
            .single();

          if (teamError || !teamData) {
            console.error("DashboardPromotor: Erro ao buscar detalhes da equipa:", teamError);
            return null;
          }

          // Buscar organizações associadas
          const { data: orgTeamData, error: orgTeamError } = await supabase
            .from('organization_teams')
        .select(`
              organization_id,
              organizations!inner(
          id,
          name,
                logo_url
              )
            `)
            .eq('team_id', teamData.id)
            .eq('is_active', true);

          const orgList = orgTeamData?.map(ot => ot.organizations).filter(Boolean) || [];

          return {
            id: teamData.id,
            name: teamData.name || 'Equipe sem nome',
            team_code: teamData.team_code,
            organizations: orgList.map(org => ({
                 id: org.id,
                 name: org.name || null,
                 logo_url: org.logo_url || null,
             })),
            role: membership?.role || 'member'
          };
        })
      );

      const formattedTeams = teamsWithOrgs.filter(Boolean);
        setTeams(formattedTeams);

    } catch (err: any) {
      console.error('DashboardPromotor: Erro geral ao carregar equipes:', err);
      setError(err.message || "Ocorreu um erro inesperado ao buscar suas equipas.");
      setTeams([]);
    } finally {
      setLoadingTeams(false);
    }
  };

  // --- Use Effects --- 
  // 1. Carrega nome do promotor e equipas
  useEffect(() => {
    if (initialAuthCheckCompleted && user?.id) {
      loadPromoterName();
      loadTeams();
    } else if (initialAuthCheckCompleted && !user?.id) {
      setLoadingTeams(false);
      setError("Utilizador não autenticado ou sessão inválida.");
      setTeams([]); 
    }
  }, [user?.id, initialAuthCheckCompleted]);

  // --- Render Logic ---

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
             Bem-vindo <strong className="font-medium text-foreground">{promoterName}</strong>!
         </p>
      </div>
      
      {/* --- Secção Cards do Dashboard --- */} 
      <div className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight">Dashboard</h2>
        
        {/* Cards Container */}
        <div className="flex flex-wrap gap-6">
           {/* Card de Links Públicos - PRIMEIRO */}
           <PromoterPublicLinkCard userId={user.id} />
           
           {/* Card da Equipa */}
           {teams.length === 0 ? (
            // --- Estado Sem Equipas (Mantido, ligeiramente ajustado) --- 
            <Card className="border-dashed bg-muted/50 w-52"> 
              <CardContent className="flex flex-col items-center justify-center py-10 px-4 text-center"> 
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
          // --- Estado Com Equipa (Card Moderno) --- 
          <Dialog>
            <DialogTrigger asChild>
              <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] dark:shadow-[0px_0px_15px_rgba(255,255,255,0.05)] p-6 space-y-3 relative overflow-hidden cursor-pointer hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0px_0px_20px_rgba(255,255,255,0.1)] transition-all duration-300">
                {/* Círculo com número no canto */}
                <div className="w-20 h-20 bg-gray-900 dark:bg-gray-700 rounded-full absolute -right-4 -top-6">
                  <p className="absolute bottom-5 left-6 text-white text-xl font-bold">1</p>
                </div>
                
                {/* Ícone da equipa */}
                <div className="w-10">
                  <Users className="w-10 h-10 text-gray-900 dark:text-gray-300" />
                </div>
                
                {/* Nome da equipa */}
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">{teams[0].name}</h1>
                
                {/* Código e role da equipa */}
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
                  Código: {teams[0].team_code || 'N/A'} • {teams[0].role === 'admin' ? 'Administrador' : 'Membro'}
                </p>
              </div>
            </DialogTrigger>
            
           <DialogContent className="mx-4 max-w-[90vw] sm:max-w-[425px] p-4 sm:p-6">
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
                      className="block p-2 sm:p-3 rounded-md hover:bg-muted transition-colors cursor-pointer" // Estilo do link clicável
                     >
                      <div className="flex items-center gap-2 sm:gap-3"> {/* Layout interno do item */} 
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
                        <p className="text-sm sm:text-base font-medium leading-tight flex-grow truncate"> {/* Tamanho responsivo, truncado */} 
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
          )}
        </div>
      </div>
    </div>
  )
} 