"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Check,
  ChevronDown,
  Download,
  Filter,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  UserCog,
  BadgeCheck,
  Calendar,
  Clock,
  Share2,
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  UserX,
  Copy,
  CheckCheck,
  Pencil,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// Interface Simplificada (sem organization_id se não for usada)
interface TeamDetails {
  id: string
  name: string
  description: string | null
  team_code: string
  logo_url: string | null
  created_by: string
  created_at: string
}

export default function EquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [copied, setCopied] = useState(false)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  
  // useEffect Simplificado
  useEffect(() => {
    const loadTeamData = async () => {
      if (!user) return;

      setLoading(true);
      setTeam(null);
      setMemberCount(null);
      
      try {
        const teamIdToLoad = user.user_metadata?.team_id;
        if (!teamIdToLoad) {
          console.error("EquipePage: ID da equipe não encontrado nos metadados do usuário.");
          toast.error("Não foi possível identificar a sua equipa.");
          setLoading(false);
          return;
        }

        console.log(`EquipePage: Carregando detalhes SIMPLIFICADOS para team_id: ${teamIdToLoad}`);

        // --- CONSULTA ÚNICA: Buscar detalhes básicos da equipa --- 
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            // Selecionar apenas os campos necessários
            .select('id, name, description, team_code, logo_url, created_by, created_at') 
            .eq('id', teamIdToLoad)
            .single();

        if (teamError) {
            console.error(`EquipePage: Erro ao carregar detalhes da equipe ${teamIdToLoad}:`, teamError);
            throw teamError;
        }
        
        if (!teamData) {
             console.error("EquipePage: Equipa não encontrada com ID:", teamIdToLoad);
             toast.error("A sua equipa não foi encontrada.");
             setLoading(false);
             return;
        }

        console.log("EquipePage: Detalhes básicos da equipe carregados:", teamData);
        setTeam(teamData as TeamDetails);

        // --- CHAMADA RPC PARA CONTAGEM (mantida) ---
        const { data: countData, error: countError } = await supabase
            .rpc('get_team_member_count', { p_team_id: teamIdToLoad });

        if (countError) {
            console.error("EquipePage: Erro ao chamar RPC get_team_member_count:", countError);
            // Toast comentado para evitar erro React
            // setTimeout(() => {toast.warning("Não foi possível carregar a contagem de membros.");}, 0);
            setMemberCount(null);
        } else {
            console.log("EquipePage: Contagem de membros (via RPC):", countData);
            setMemberCount(countData);
        }

      } catch (error) {
        console.error("EquipePage: Erro GERAL ao carregar dados da equipa:", error);
        // Toast comentado para evitar erro React
        // toast.error("Ocorreu um erro ao carregar as informações da equipa.");
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [user, supabase]);
  
  // copyTeamCode (mantido de minha-equipe)
  const copyTeamCode = () => {
    if (!team) return
    navigator.clipboard.writeText(team.team_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código da equipe copiado para a área de transferência')
  }
  
  // formatDate (mantido de minha-equipe)
  const formatDate = (dateString: string | null) => {
      if (!dateString) return '-'
      try {
          return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })
      } catch { return 'Data inválida' }
  }
  
  // JSX Refatorado para consistência
  if (loading) {
    // Usar Skeleton similar ao dashboard do organizador
    return (
      <div className="container py-8 space-y-6">
        {/* Skeleton Cabeçalho */}
        <div className="h-10 w-1/3 bg-muted animate-pulse rounded"></div>
        <div className="h-4 w-1/2 bg-muted animate-pulse rounded"></div>
        <Separator />
        {/* Skeleton Cards Código/Membros */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader><div className="h-5 w-24 bg-muted animate-pulse rounded"></div></CardHeader>
            <CardContent><div className="h-10 w-full bg-muted animate-pulse rounded"></div></CardContent>
          </Card>
          {/* Skeleton para Card de Contagem de Membros */}
          <Card>
            <CardHeader><div className="h-5 w-20 bg-muted animate-pulse rounded"></div></CardHeader>
            <CardContent><div className="h-10 w-full bg-muted animate-pulse rounded"></div></CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  if (!team && !loading) {
    // ... (renderização "Nenhuma equipe encontrada" como antes)
     return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma equipe encontrada</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Parece que você não está associado a nenhuma equipe como líder ou criador.
            </p>
            <Link href="/app/chefe-equipe/criar-equipe">
              <Button>Criar Minha Equipe</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Renderização principal com componentes Shadcn
  return (
    <div className="container py-8 space-y-6">
      {/* Cabeçalho Padrão */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-center justify-between">
        <div>
           {/* Padrão Título H1 */}
          <h1 className="text-3xl font-bold tracking-tight">{team?.name || 'A Minha Equipa'}</h1>
          <p className="text-muted-foreground mt-1">{team?.description || 'Código da equipa e número de elementos.'}</p>
        </div>
         {/* Botão Configurações (Corrigido/Reintroduzido) */}
         <div className="flex items-center space-x-2">
             <Link href={"/app/chefe-equipe/configuracoes"}>
                 <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4"/> Configurações
                 </Button>
             </Link>
         </div>
      </div>
      
      {/* --- REINTRODUZIR SEPARADOR E GRELHA DE CARDS --- */}
      <Separator />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Card Código da Equipe (Restaurado) */}
          <Card>
             <CardHeader>
               <CardTitle className="text-lg">Código da Equipa</CardTitle>
               <CardDescription>Partilhe para adicionar promotores.</CardDescription>
             </CardHeader>
             <CardContent>
               <div className="flex space-x-2">
                 <Input readOnly value={team?.team_code || 'N/A'} className="font-mono text-center" />
                 <Button size="icon" variant="outline" onClick={copyTeamCode} disabled={!team?.team_code}>
                   {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                 </Button>
               </div>
             </CardContent>
           </Card>
           
          {/* Card Contagem de Membros (Restaurado) */}
          <Card>
             <CardHeader>
                 <CardTitle className="text-lg">Membros</CardTitle>
                 <CardDescription>Total de elementos na equipa.</CardDescription>
             </CardHeader>
             <CardContent>
                 <div className="flex items-center gap-4">
                     <Users className="h-8 w-8 text-primary" />
                     <div>
                        <p className="text-2xl font-bold">{memberCount !== null ? memberCount : '-'}</p> 
                        <p className="text-sm text-muted-foreground">Total de elementos</p>
                     </div>
                 </div>
             </CardContent>
           </Card>
      </div>
      {/* --- FIM DA SECÇÃO REINTRODUZIDA --- */}

    </div>
  )
}
