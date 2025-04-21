"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, PlusCircle, Loader2, AlertCircle, CalendarDays, Building, ShieldCheck, LogIn } from 'lucide-react'
import { toast } from 'sonner'

// Interface Mínima
interface Team {
  id: string;
  name: string;
  team_code?: string | null;
  role?: string;
}

export default function PromotorDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
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
        .select("team_id, role")
        .eq('user_id', user.id);

      if (memberError) throw new Error("Erro ao buscar suas associações de equipa.");
      if (!memberData || memberData.length === 0) {
        console.log("DashboardPromotor: Nenhuma associação de equipe encontrada.");
        setTeams([]);
        setLoadingTeams(false);
        return; 
      }

      const teamIds = memberData.map(member => member.team_id);
      
      // Buscar detalhes das equipas (apenas o necessário)
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name, team_code') // Apenas id, nome, código
        .in('id', teamIds);

      if (teamsError) throw new Error("Erro ao carregar detalhes das equipas.");

      if (teamsData && teamsData.length > 0) {
        const formattedTeams = teamsData.map(team => {
          const membership = memberData.find(m => m.team_id === team.id);
          return {
            id: team.id,
            name: team.name || 'Equipe sem nome',
            team_code: team.team_code,
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
    if (user) {
      loadTeams();
    } else {
      const timer = setTimeout(() => !user && setLoadingTeams(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [user]);
  
  // --- Render Logic --- 
  if (loadingTeams) { // Loading inicial
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
             Bem-vindo {user?.user_metadata?.full_name || user?.email || 'Promotor'}!
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
              <p className="text-lg font-semibold text-indigo-600 truncate"> 
                {teams[0].name}
              </p>
              {/* Código da Equipa */} 
              <div className="flex items-center text-xs text-muted-foreground">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" /> 
                <span>Código: {teams[0].team_code || 'N/A'}</span>
              </div>
               {/* Linha Separadora */}
              <hr className="my-2 w-full" /> {/* Separador a toda a largura */} 
               {/* Botão de Ação */} 
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => router.push('/app/promotor/equipes')}
              >
                 <LogIn className="mr-1.5 h-3.5 w-3.5" /> {/* Ícone LogIn */} 
                 Entrar {/* Texto do botão alterado */} 
              </Button>
            </CardContent>
            {/* Remover CardFooter se não for necessário */}
          </Card>
        )}
      </div>
    </div> 
  )
} 