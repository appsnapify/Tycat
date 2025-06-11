"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/app/_providers/auth-provider'
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

// Nova interface para membros detalhados
interface DetailedMember {
  user_id: string;
  member_role: string; // Corresponde ao output da RPC
  first_name: string | null; // Corresponde ao output da RPC
  last_name: string | null; // Corresponde ao output da RPC
  phone: string | null; // Mantemos para o futuro
}

export default function EquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [detailedMembers, setDetailedMembers] = useState<DetailedMember[]>([])
  const [showMembersSection, setShowMembersSection] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  
  // useEffect Simplificado
  useEffect(() => {
    const loadInitialPageData = async () => {
      if (!user) return;

      setLoading(true);
      setTeam(null);
      setMemberCount(null);
      setDetailedMembers([]);
      setShowMembersSection(false);
      
      try {
        const teamIdToLoad = user.user_metadata?.team_id;
        if (!teamIdToLoad) {
          console.error("EquipePage: ID da equipe não encontrado nos metadados do usuário.");
          toast.error("Não foi possível identificar a sua equipa.");
          setLoading(false);
          return;
        }

        const supabase = createClient();
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

        setTeam(teamData as TeamDetails);

        // --- CHAMADA RPC PARA CONTAGEM (mantida) ---
        const { data: countData, error: countError } = await supabase
            .rpc('get_team_member_count', { p_team_id: teamIdToLoad });

        if (countError) {
            console.error("EquipePage: Erro ao chamar RPC get_team_member_count:", countError);
            setMemberCount(null);
        } else {
            setMemberCount(countData);
        }

      } catch (error) {
        console.error("EquipePage: Erro GERAL ao carregar dados da equipa:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialPageData();
  }, [user]); // Removido supabase para evitar loops
  
  // copyTeamCode (mantido de minha-equipe)
  const copyTeamCode = () => {
    if (!team) return
    navigator.clipboard.writeText(team.team_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código da equipe copiado para a área de transferência')
  }
  
  // Nova função para copiar o link da página pública
  const copyPublicProfileLink = () => {
    if (!user?.id) return;
    // Determinar o URL base dinamicamente ou usar um valor fixo para produção
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:3000' 
      : 'https://snapify-xm3c.vercel.app';
    const publicLink = `${baseUrl}/promotor/${user.id}`;
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    toast.success('Link da página pública copiado!');
  };
  
  // formatDate (mantido de minha-equipe)
  const formatDate = (dateString: string | null) => {
      if (!dateString) return '-'
      try {
          return new Date(dateString).toLocaleDateString('pt-PT', {
            day: '2-digit', month: '2-digit', year: 'numeric'
          })
      } catch { return 'Data inválida' }
  }
  
  // Nova função para carregar membros detalhados sob demanda
  const loadDetailedMembersOnClick = async () => {
    if (!team?.id) return; 

    setLoadingMembers(true);
    setDetailedMembers([]); 

    try {
      const supabase = createClient();
      const { data: rpcMembersData, error: rpcMembersError } = await supabase
        .rpc('get_team_members_with_details', { p_team_id: team.id });

      if (rpcMembersError) {
        console.error(`EquipePage: Erro ao carregar membros via RPC (on-demand) para team ${team.id}:`, rpcMembersError);
        toast.error("Erro ao carregar lista de membros.");
      } else if (rpcMembersData) {
        const formattedMembers = rpcMembersData.map(member => ({
          user_id: member.user_id,
          member_role: member.member_role,
          first_name: member.first_name,
          last_name: member.last_name,
          phone: null 
        }));
        setDetailedMembers(formattedMembers as DetailedMember[]);
      }
    } catch (error) {
      console.error("EquipePage: Erro GERAL ao carregar membros detalhados (on-demand):", error);
      toast.error("Ocorreu um erro ao buscar os membros.");
    } finally {
      setLoadingMembers(false);
    }
  };
  
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
              <Button className="bg-lime-500 hover:bg-lime-600 text-white">Criar Minha Equipe</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Renderização principal com componentes Shadcn
  return (
    <div className="container py-8 space-y-6">
      {/* Cabeçalho Simplificado - Removido botão configurações */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 md:items-center justify-between">
        <div>
           {/* Padrão Título H1 */}
          <h1 className="text-3xl font-bold tracking-tight">{team?.name || 'A Minha Equipa'}</h1>
          <p className="text-muted-foreground mt-1">{team?.description || 'Código da equipa e número de elementos.'}</p>
         </div>
      </div>
      
      {/* --- REINTRODUZIR SEPARADOR E GRELHA DE CARDS --- */}
      <Separator />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Card Código da Equipe - Padrão PromoterPublicLinkCard */}
          <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_25px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-3 relative overflow-hidden cursor-pointer transition-all duration-300">
            {/* Círculo com símbolo no canto */}
            <div className="w-20 h-20 bg-black rounded-full absolute -right-4 -top-6">
              <div className="absolute bottom-5 left-5">
                <Copy className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Ícone principal */}
            <div className="w-10">
              <Copy className="w-10 h-10 text-black" />
            </div>
            
            {/* Título */}
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">Código da Equipa</h1>
            
            {/* Descrição com código */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
              {team?.team_code || 'N/A'}
            </p>

            {/* Botão de ação */}
            <div className="pt-2">
              <button 
                onClick={copyTeamCode} 
                disabled={!team?.team_code}
                className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
               </div>
           
          {/* Card Contagem de Membros - Padrão PromoterPublicLinkCard */}
          <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_25px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-3 relative overflow-hidden cursor-pointer transition-all duration-300">
            {/* Círculo com símbolo no canto */}
            <div className="w-20 h-20 bg-black rounded-full absolute -right-4 -top-6">
              <div className="absolute bottom-5 left-5">
                <Users className="w-6 h-6 text-white" />
                     </div>
                 </div>
            
            {/* Ícone principal */}
            <div className="w-10">
              <Users className="w-10 h-10 text-black" />
            </div>
            
            {/* Título */}
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">Membros</h1>
            
            {/* Descrição com contagem */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
              {memberCount !== null ? `${memberCount} elemento${memberCount !== 1 ? 's' : ''}` : 'Contagem indisponível'}
            </p>

            {/* Informação adicional */}
            <div className="pt-2">
              <div className="w-full flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-md">
                <UserCog className="w-3 h-3" />
                Total da equipa
              </div>
            </div>
          </div>

          {/* Card Link Página Pública - Padrão PromoterPublicLinkCard */}
          {user?.id && (
            <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_25px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-3 relative overflow-hidden cursor-pointer transition-all duration-300">
              {/* Círculo com símbolo no canto */}
              <div className="w-20 h-20 bg-black rounded-full absolute -right-4 -top-6">
                <div className="absolute bottom-5 left-5">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
              </div>
              
              {/* Ícone principal */}
              <div className="w-10">
                <Share2 className="w-10 h-10 text-black" />
              </div>
              
              {/* Título */}
              <h1 className="font-bold text-lg text-gray-900 dark:text-white">Link Público</h1>
              
              {/* Descrição */}
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
                Para partilhar
              </p>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={copyPublicProfileLink}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </button>
                <button 
                  onClick={() => window.open(`${typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:3000' : 'https://snapify-xm3c.vercel.app'}/promotor/${user.id}`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Abrir
                </button>
              </div>
            </div>
          )}
      </div>
      {/* --- FIM DA SECÇÃO REINTRODUZIDA --- */}

      {/* Card/Secção para Membros da Equipa (Carregamento On-Demand) - Cores harmonizadas */}
      <Card>
        <CardHeader 
          className="flex flex-row items-center justify-between cursor-pointer" 
          onClick={() => {
            // Se a secção não estiver aberta, carrega os dados e abre
            if (!showMembersSection) {
              loadDetailedMembersOnClick();
              setShowMembersSection(true);
            } else {
              // Se estiver aberta, apenas fecha
              setShowMembersSection(false);
            }
          }}
        >
          <div>
            <CardTitle className="text-gray-900 dark:text-white">Membros da Equipa</CardTitle>
            <CardDescription>
              {showMembersSection ? "Clique para esconder" : "Clique para ver a lista de promotores e o líder."}
            </CardDescription>
          </div>
          {loadingMembers ? <Loader2 className="h-5 w-5 animate-spin" /> : (showMembersSection ? <ChevronDown className="h-5 w-5 rotate-180 transition-transform" /> : <ChevronDown className="h-5 w-5 transition-transform" />) }
        </CardHeader>

        {showMembersSection && !loadingMembers && detailedMembers.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedMembers.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.first_name || 'N/A'} {member.last_name || ''}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.member_role === 'leader' ? 'default' : 'secondary'} className={member.member_role === 'leader' ? 'bg-black dark:bg-white dark:text-black text-white' : ''}>
                        {member.member_role === 'leader' ? 'Líder' : member.member_role === 'member' ? 'Promotor' : member.member_role}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
        {showMembersSection && loadingMembers && (
          <CardContent className="flex justify-center items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-500" /> 
            <p className="ml-2">A carregar membros...</p>
          </CardContent>
        )}
        {showMembersSection && !loadingMembers && detailedMembers.length === 0 && (
           <CardContent>
             <p className="text-muted-foreground py-4">Nenhum membro encontrado ou ainda não foram carregados. Clique novamente para tentar carregar.</p>
           </CardContent>
        )}
      </Card>
    </div>
  )
}
