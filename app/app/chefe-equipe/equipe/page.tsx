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

interface TeamMember {
  id: string
  role: string
  user_id: string
  name: string
  email: string
  commission_rate: number | null
}

interface TeamDetails {
  id: string
  name: string
  description: string | null
  team_code: string
  logo_url: string | null
  created_by: string
  member_count: number // Pode ser removido se calcularmos a partir de members.length
  created_at: string
  organization_id: string | null
}

export default function EquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  // Estados (mantidos de minha-equipe)
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [copied, setCopied] = useState(false)
  const [showAddPromoter, setShowAddPromoter] = useState(false)
  const [newPromoterEmail, setNewPromoterEmail] = useState('')
  const [customRate, setCustomRate] = useState(0)
  const [addingPromoter, setAddingPromoter] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editRate, setEditRate] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [organizationName, setOrganizationName] = useState<string | null>(null)
  
  // useEffect para carregar dados (mantido de minha-equipe)
  useEffect(() => {
    if (user) {
      loadTeamData()
    }
  }, [user])
  
  // loadTeamData (mantido e adaptado de minha-equipe)
  const loadTeamData = async () => {
    setLoading(true)
    setOrganizationName(null)
    try {
      if (!user || !user.id) {
        console.log("Usuário não autenticado")
        // Talvez redirecionar ou mostrar erro
        return
      }
      
      console.log("EquipePage: Carregando dados da equipe para:", user.id)
      
      let teamIdToLoad: string | null = null
      let loadedTeamData: any = null
      
      // Prioridade 1: Metadados do usuário
      if (user.user_metadata?.team_id) {
        teamIdToLoad = user.user_metadata.team_id
        console.log("EquipePage: ID da equipe encontrado nos metadados:", teamIdToLoad)
      }
       // Prioridade 2: Verificar se é líder em team_members (se metadados falharem)
      else {
          console.log("EquipePage: Verificando se usuário é líder em team_members")
          const { data: teamMember, error: teamMemberError } = await supabase
            .from('team_members')
            .select('team_id, role')
            .eq('user_id', user.id)
            .eq('role', 'leader') // Ou 'chefe-equipe' dependendo do valor no DB
            .maybeSingle()

          if (teamMemberError && teamMemberError.code !== 'PGRST116') {
             console.error("EquipePage: Erro ao verificar liderança:", teamMemberError)
          } else if (teamMember) {
             teamIdToLoad = teamMember.team_id
             console.log("EquipePage: Encontrado como líder da equipe:", teamIdToLoad)
          }
      }

      // Prioridade 3: Verificar se é criador em teams (se tudo acima falhar)
      if (!teamIdToLoad) {
          console.log("EquipePage: Verificando se é criador de alguma equipe")
          const { data: ownedTeam, error: ownedTeamError } = await supabase
            .from('teams')
            .select('id')
            .eq('created_by', user.id)
            .maybeSingle()
          
           if (ownedTeamError && ownedTeamError.code !== 'PGRST116') {
             console.error("EquipePage: Erro ao verificar equipes criadas:", ownedTeamError)
           } else if (ownedTeam) {
              teamIdToLoad = ownedTeam.id
              console.log("EquipePage: Encontrado como criador da equipe:", teamIdToLoad)
           }
      }

      // Se finalmente temos um ID, carregar os detalhes
      if (teamIdToLoad) {
          console.log(`EquipePage: Carregando detalhes para team_id: ${teamIdToLoad}`)
          const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('id, name, description, team_code, logo_url, created_by, created_at, organization_id')
            .eq('id', teamIdToLoad)
            .single()
           
           if (teamError) {
             console.error(`EquipePage: Erro ao carregar detalhes da equipe ${teamIdToLoad}:`, teamError)
             // Tentar fallback para metadados se foi essa a origem do ID
             if(user.user_metadata?.team_id === teamIdToLoad) {
                 loadedTeamData = {
                    id: teamIdToLoad,
                    name: user.user_metadata.team_name || "Minha Equipe",
                    description: "Detalhes indisponíveis",
                    team_code: user.user_metadata.team_code || "EQUIPE",
                    logo_url: null,
                    created_by: user.id,
                    created_at: new Date().toISOString(),
                    organization_id: null,
                 }
             } else {
                 throw new Error("Não foi possível carregar detalhes da equipe.")
             }
           } else { 
              console.log("EquipePage: Detalhes da equipe carregados:", teamData)
              setTeam(teamData as TeamDetails)
              await loadTeamMembers(teamIdToLoad)
              
              if (teamData.organization_id) {
                  console.log(`EquipePage: Buscando organização com ID: ${teamData.organization_id}`)
                  const { data: orgData, error: orgError } = await supabase
                      .from('organizations')
                      .select('name')
                      .eq('id', teamData.organization_id)
                      .single()

                  if (orgError) {
                      console.error(`EquipePage: Erro ao buscar organização ${teamData.organization_id}:`, orgError)
                      toast.warning("Não foi possível carregar o nome da organização associada.")
                  } else if (orgData) {
                      console.log("EquipePage: Nome da organização encontrado:", orgData.name)
                      setOrganizationName(orgData.name)
                  } else {
                      console.log(`EquipePage: Organização ${teamData.organization_id} não encontrada.`)
                  }
              } else {
                   console.log("EquipePage: Equipa não associada a uma organização.")
              }
           }
          
      } else {
        // Se chegou aqui, não tem equipe associada de nenhuma forma
        console.log("EquipePage: Usuário não tem equipe associada. Redirecionando para criar...")
        toast.info("Você ainda não tem uma equipe. Crie uma para começar!")
        router.push('/app/chefe-equipe/criar-equipe')
      }
      
    } catch (error) {
      console.error('EquipePage: Erro ao carregar dados:', error)
      toast.error('Não foi possível carregar os dados da equipe.')
      setTeam(null)
    } finally {
      setLoading(false)
    }
  }
  
  // loadTeamMembers (mantido e adaptado de minha-equipe)
  const loadTeamMembers = async (teamId: string) => {
     // ... (código de loadTeamMembers como em minha-equipe, 
     // incluindo a chamada a enhanceMembersData) ...
     try {
      console.log("EquipePage: Carregando membros para equipe:", teamId)
      
      // Tentar primeiro com relação profiles
      let membersResult = []
      let queryError = null
      try {
           console.log("EquipePage: Tentando carregar membros com profiles...")
            const { data, error } = await supabase
                .from('team_members')
                .select('id, user_id, role, commission_rate, profiles(id, email, first_name, last_name, avatar_url)') // Tentar join
                .eq('team_id', teamId)
            if (error) throw error // Lança para o catch externo se falhar
            console.log(`EquipePage: ${data?.length || 0} membros carregados com profiles.`)
            // Mapear para a estrutura TeamMember esperada
            membersResult = data?.map((m: any) => { // Adicionar tipo 'any' para clareza temporária
                 const profile = m.profiles; // Extrair para variável
                 const name = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : `Usuário ${m.user_id.slice(0,4)}`;
                 const email = profile?.email || 'Email indisponível';
                 return {
                     id: m.id,
                     role: m.role,
                     user_id: m.user_id,
                     name: name,
                     email: email,
                     commission_rate: m.commission_rate
                 }
            }) || []
            setMembers(membersResult)
            return // Sucesso, sair da função
      } catch (errorWithProfile) {
          console.warn("EquipePage: Falha ao carregar membros com profiles, tentando sem join:", errorWithProfile)
          queryError = errorWithProfile // Guardar erro para referência
      }

      // Fallback: Consulta simplificada sem join se a anterior falhar
      console.log("EquipePage: Tentando consulta simplificada de team_members...")
      const { data: simpleMembersData, error: simpleMembersError } = await supabase
        .from('team_members')
        .select('id, user_id, role, commission_rate')
        .eq('team_id', teamId)
        
       if (simpleMembersError) {
         console.error("EquipePage: Erro ao carregar membros (consulta simplificada):", simpleMembersError)
         throw simpleMembersError // Lança erro se a consulta simples também falhar
       }
       
      if (!simpleMembersData || simpleMembersData.length === 0) {
        console.log("EquipePage: Nenhum membro encontrado (consulta simplificada)")
        // Adicionar pelo menos o usuário atual se a lista estiver vazia
        if (user) {
          setMembers([{
            id: 'current-user',
            role: 'leader', // Assumir líder aqui se é o único
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Você',
            email: user.email || '',
            commission_rate: null
          }])
        } else {
          setMembers([])
        }
        return
      }
      
       console.log(`EquipePage: ${simpleMembersData.length} membros encontrados (consulta simplificada). Iniciando enrich...`)
       // Processar e tentar enriquecer
       const initialMembers = simpleMembersData.map(member => ({
          id: member.id,
          role: member.role,
          user_id: member.user_id,
          name: `Usuário ${member.user_id.slice(0,4)}`, // Placeholder
          email: 'Carregando...', // Placeholder
          commission_rate: member.commission_rate
       }))
       setMembers(initialMembers)
       enhanceMembersData(simpleMembersData) // Chamar para buscar nomes/emails

    } catch (error) {
      console.error('EquipePage: Erro GERAL ao carregar membros:', error)
      // Fallback final
      if (user) {
        setMembers([{
          id: 'current-user', role: 'leader', user_id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Você',
          email: user.email || '', commission_rate: null
        }])
      }
    }
  }
  
  // enhanceMembersData (adaptado de minha-equipe)
   const enhanceMembersData = async (membersData: any[]) => {
    try {
      const userIds = membersData.map(member => member.user_id).filter(id => id)
      if (userIds.length === 0) return

      console.log(`EquipePage: Enriquecendo ${userIds.length} membros...`)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles') // Assumindo que a view/tabela de perfis é 'profiles'
        .select('id, email, first_name, last_name') // Ajustar campos conforme necessário
        .in('id', userIds)
        
      if (usersError) {
        console.warn("EquipePage: Não foi possível carregar detalhes dos perfis para enriquecer:", usersError)
        return
      }
      
      if (!usersData || usersData.length === 0) {
        console.log("EquipePage: Nenhum dado de perfil encontrado para enriquecer membros")
        return
      }
      
      // Atualizar o estado `members` existente
      setMembers(prevMembers => prevMembers.map(member => {
        const userData = usersData.find(u => u.id === member.user_id)
        if (!userData) return member // Manter dados placeholder se não encontrar perfil
        return {
          ...member,
          name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : `Usuário ${member.user_id.slice(0,4)}`,
          email: userData.email || 'Email indisponível'
        }
      }))
      console.log("EquipePage: Dados de membros enriquecidos.")
      
    } catch (error) {
      console.error("EquipePage: Erro ao enriquecer dados dos membros:", error)
    }
  }

  // copyTeamCode (mantido de minha-equipe)
  const copyTeamCode = () => {
    // ... (código copyTeamCode como antes)
     if (!team) return
    navigator.clipboard.writeText(team.team_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código da equipe copiado para a área de transferência')
  }
  
  // addPromoter (mantido de minha-equipe)
  const addPromoter = async () => {
    // ... (código addPromoter como antes)
     if (!newPromoterEmail.trim() || !team) {
      toast.error('Por favor, insira um email válido.')
      return
    }
    setAddingPromoter(true)
    try {
      const { data: userData, error: userError } = await supabase
        .from('profiles') // Usar profiles para verificar se existe
        .select('id')
        .eq('email', newPromoterEmail.trim())
        .maybeSingle()
      if (userError) throw userError
      if (!userData) {
        toast.error('Usuário não encontrado com este email.')
        return
      }
      const { data: existingMember, error: existingError } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', team.id)
        .eq('user_id', userData.id)
        .maybeSingle()
      if (existingError) throw existingError
      if (existingMember) {
        toast.error('Este usuário já é membro da equipe.')
        return
      }
      const { error: addError } = await supabase
        .from('team_members')
        .insert({ team_id: team.id, user_id: userData.id, role: 'promoter', commission_rate: customRate > 0 ? customRate : null })
      if (addError) throw addError
      toast.success('Promotor adicionado com sucesso!')
      setShowAddPromoter(false)
      setNewPromoterEmail('')
      setCustomRate(0)
      await loadTeamMembers(team.id)
    } catch (error) {
      console.error('Erro ao adicionar promotor:', error)
      toast.error('Erro ao adicionar promotor. Tente novamente.')
    } finally {
      setAddingPromoter(false)
    }
  }
  
  // removeMember (mantido de minha-equipe)
  const removeMember = async (memberId: string, memberName: string) => {
    // ... (código removeMember como antes)
     if (!team) return
    if (!confirm(`Tem certeza que deseja remover ${memberName} da equipe?`)) return
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId)
      if (error) throw error
      toast.success(`${memberName} foi removido da equipe.`)
      setMembers(prev => prev.filter(member => member.id !== memberId))
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      toast.error('Erro ao remover membro. Tente novamente.')
    }
  }
  
  // updateMemberRate (mantido de minha-equipe)
  const updateMemberRate = async () => {
    // ... (código updateMemberRate como antes)
    if (!editingMember || !team) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ commission_rate: editRate > 0 ? editRate : null })
        .eq('id', editingMember.id)
      if (error) throw error
      toast.success('Taxa de comissão atualizada!')
      setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, commission_rate: editRate > 0 ? editRate : null } : m))
      setEditingMember(null)
    } catch (error) {
      console.error('Erro ao atualizar comissão:', error)
      toast.error('Erro ao atualizar taxa. Tente novamente.')
    } finally {
      setUpdating(false)
    }
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
          <Card>
            <CardHeader><div className="h-5 w-20 bg-muted animate-pulse rounded"></div></CardHeader>
            <CardContent><div className="h-10 w-full bg-muted animate-pulse rounded"></div></CardContent>
          </Card>
        </div>
        {/* Skeleton Tabela Membros */}
        <Card>
           <CardHeader>
             <div className="h-6 w-32 bg-muted animate-pulse rounded mb-2"></div>
             <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
           </CardHeader>
           <CardContent>
             <div className="space-y-3">
               <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
               <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
               <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
             </div>
           </CardContent>
        </Card>
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
          <h1 className="text-3xl font-bold tracking-tight">{team?.name || 'Equipe'}</h1>
          <p className="text-muted-foreground mt-1">{team?.description || 'Gerencie os detalhes e membros da sua equipe'}</p>
        </div>
         <div className="flex items-center space-x-2">
             <Link href={`/app/chefe-equipe/configuracoes`}>
                 {/* Padrão Botão Secundário */} 
                 <Button variant="outline" size="sm">
                    <Settings className="mr-2 h-4 w-4"/> Configurações
                 </Button>
             </Link>
          </div>
      </div>

      <Separator />
      
      {/* Grid Padrão para Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {/* Card Padrão */}
          <Card>
            <CardHeader>
              {/* Padrão Título Card */} 
              <CardTitle className="text-lg">Código da Equipe</CardTitle>
              {/* Padrão Descrição Card */} 
              <CardDescription>Compartilhe para adicionar promotores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input readOnly value={team?.team_code || 'N/A'} className="font-mono text-center" />
                 {/* Padrão Botão Ícone Outline */}
                <Button size="icon" variant="outline" onClick={copyTeamCode} disabled={!team?.team_code}>
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Membros</CardTitle>
              <CardDescription>Total de membros na equipe.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{members.length}</p> 
                  <p className="text-sm text-muted-foreground">Total de membros</p>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>

      {/* Card com Tabela */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
             {/* Ajustar Título do Card para consistência */}
            <CardTitle className="text-xl font-semibold">Membros da Equipe</CardTitle>
            {/* Padrão Descrição Card */} 
            {organizationName && (
               <CardDescription>
                   Organização: <span className="font-medium">{organizationName}</span>
               </CardDescription>
            )}
            {team.description && (
               <CardDescription>{team.description}</CardDescription>
            )}
          </div>
          <Dialog open={showAddPromoter} onOpenChange={setShowAddPromoter}>
            <DialogTrigger asChild>
                {/* Padrão Botão Primário Pequeno */} 
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" /> Adicionar Promotor
                </Button>
            </DialogTrigger>
            <DialogContent>
                 <DialogHeader>
                    <DialogTitle>Adicionar Promotor</DialogTitle>
                    <DialogDescription>Digite o email do promotor para convidá-lo.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <Input placeholder="Email do promotor" value={newPromoterEmail} onChange={(e) => setNewPromoterEmail(e.target.value)} />
                    <div>
                        <Label>Taxa de Comissão (%) - Opcional</Label>
                        <Slider defaultValue={[0]} max={100} step={1} onValueChange={(value) => setCustomRate(value[0])} />
                        <p className="text-sm text-muted-foreground mt-1">{customRate}% (0% usa padrão)</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddPromoter(false)}>Cancelar</Button>
                    <Button onClick={addPromoter} disabled={addingPromoter}>
                        <Loader2 className={`mr-2 h-4 w-4 animate-spin ${addingPromoter ? '' : 'hidden'}`}/> Adicionar
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0"> {/* Remover padding para a tabela ocupar espaço total */} 
           <Table>
             <TableHeader>
               <TableRow>
                 {/* Certificar que não há espaços aqui */}
                 <TableHead className="pl-6">Membro</TableHead>
                 <TableHead className="hidden md:table-cell">Email</TableHead>
                 <TableHead>Função</TableHead>
                 <TableHead>Comissão</TableHead>
                 <TableHead className="text-right pr-6">Ações</TableHead>
                 {/* Certificar que não há espaços aqui */}
               </TableRow>
             </TableHeader>
             <TableBody>
               {/* Condicional movida para fora do TableBody se possível, ou garantir nenhum espaço aqui */}
               {members.length === 0 && !loading ? (
                  <TableRow>
                     {/* Certificar que não há espaços aqui */}
                     <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                       Nenhum promotor nesta equipe ainda.
                     </TableCell>
                     {/* Certificar que não há espaços aqui */}
                  </TableRow>
               ) : (
                 members.map((member) => (
                   <TableRow key={member.id || member.user_id}>
                     {/* Certificar que não há espaços aqui */}
                     <TableCell className="font-medium pl-6">
                       <div className="flex items-center space-x-3">
                         <Avatar className="h-8 w-8">
                           <AvatarFallback>{member.name?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                         </Avatar>
                         <span>{member.name || 'Carregando...'}</span>
                       </div>
                     </TableCell>
                     <TableCell className="hidden md:table-cell text-muted-foreground">{member.email || 'Carregando...'}</TableCell>
                     <TableCell>
                       <Badge variant={member.role === 'leader' || member.role === 'chefe-equipe' ? 'default' : 'secondary'}>
                         {member.role === 'leader' || member.role === 'chefe-equipe' ? 'Líder' : 'Promotor'}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center">
                         <span className="text-sm">{member.commission_rate !== null ? `${member.commission_rate}%` : 'Padrão'}</span>
                         {(member.role !== 'leader' && member.role !== 'chefe-equipe') && (
                           <TooltipProvider delayDuration={100}>
                             <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="ml-1 h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => { setEditingMember(member); setEditRate(member.commission_rate || 0); }}>
                                   <Pencil className="h-3 w-3"/>
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>Editar Comissão</p></TooltipContent>
                             </Tooltip>
                           </TooltipProvider>
                         )}
                       </div>
                     </TableCell>
                     <TableCell className="text-right pr-6">
                       {(member.user_id !== user?.id && (member.role !== 'leader' && member.role !== 'chefe-equipe')) && (
                         <TooltipProvider delayDuration={100}>
                            <Tooltip>
                               <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive-foreground hover:bg-destructive/90 h-8 w-8" onClick={() => removeMember(member.id || member.user_id, member.name || 'Membro')}>
                                   <Trash2 className="h-4 w-4"/>
                                 </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>Remover Membro</p></TooltipContent>
                             </Tooltip>
                          </TooltipProvider>
                       )}
                     </TableCell>
                     {/* Certificar que não há espaços aqui */}
                   </TableRow>
                 ))
               )}
               {/* Certificar que não há espaços aqui */}
             </TableBody>
           </Table>
        </CardContent>
      </Card>
      
       {/* Modal Editar Comissão */}
       <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
          <DialogContent>
           <DialogHeader>
             <DialogTitle>Editar Comissão de {editingMember?.name}</DialogTitle>
             <DialogDescription>Defina uma taxa de comissão personalizada (0% para usar o padrão).</DialogDescription>
           </DialogHeader>
           <div className="py-4 space-y-2">
              <Label>Taxa de Comissão (%)</Label>
              <Slider defaultValue={[editRate]} max={100} step={1} onValueChange={(value) => setEditRate(value[0])} />
              <p className="text-sm text-muted-foreground mt-1">{editRate}%</p>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setEditingMember(null)}>Cancelar</Button>
             <Button onClick={updateMemberRate} disabled={updating}>
               <Loader2 className={`mr-2 h-4 w-4 animate-spin ${updating ? '' : 'hidden'}`}/> Salvar Comissão
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  )
} 