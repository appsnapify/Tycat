"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  PlusCircle, 
  Search, 
  Users, 
  Settings,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from 'sonner'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { Label } from '@/components/ui/label'
import { associateTeamAction } from '@/app/actions/organizerActions'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { createClient } from '@/lib/supabase'

// Definir cores consistentes com o tema
const colors = {
  primary: "bg-lime-500 hover:bg-lime-600 text-white",
  secondary: "bg-white hover:bg-gray-50 text-gray-700",
  accent: "bg-fuchsia-500 hover:bg-fuchsia-600 text-white",
  badge: {
    green: "bg-green-100 text-green-800",
    fuchsia: "bg-fuchsia-100 text-fuchsia-800",
    gray: "bg-gray-100 text-gray-700"
  }
}

interface Team {
  id: string
  name: string
  team_code: string
  member_count: number
}

interface Organization {
  id: string
  name: string
  slug: string
}

export default function OrganizadorEquipesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [filteredTeams, setFilteredTeams] = useState<Team[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false)
  const [showCallTeamDialog, setShowCallTeamDialog] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [associationCode, setAssociationCode] = useState('')
  const [associatingTeam, setAssociatingTeam] = useState(false)

  useEffect(() => {
    if (user) {
      loadOrganizationAndTeams()
    }
  }, [user])

  useEffect(() => {
    filterTeams()
  }, [teams, searchQuery])

  const loadOrganizationAndTeams = async () => {
    console.log('Iniciando carregamento de equipes via RPC...');
    setLoading(true);
    
    try {
      const { data: orgDataArray, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id)
        .in('role', ['owner', 'organizador'])
        .limit(1);

      if (orgError) {
        console.error('Erro DETALHADO ao buscar user_organizations na página de equipas:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        });
        requestAnimationFrame(() => {
           toast.error('Não foi possível carregar os dados da organização.');
        });
        setLoading(false);
        return;
      }

      if (!orgDataArray || orgDataArray.length === 0) {
         console.log('Nenhuma organização encontrada para o usuário nesta página.');
         requestAnimationFrame(() => {
           toast.error('Nenhuma organização associada encontrada.');
         });
         setLoading(false);
         setTeams([]);
         setFilteredTeams([]);
         return;
      }

      const orgData = orgDataArray[0];
      const organizationId = orgData.organization_id;
      console.log('ID da organização a ser usado na RPC:', organizationId);
      
      setOrganization({ id: organizationId, name: '', slug: '' });

      const { data: teamsWithCounts, error: rpcError } = await supabase
        .rpc('get_organization_teams_with_counts', { 
          org_id: organizationId 
        });
      
      console.log('Resposta COMPLETA da RPC:', { data: teamsWithCounts, error: rpcError });

      if (rpcError) {
        console.error('Erro DETALHADO ao chamar RPC:', JSON.stringify(rpcError, null, 2)); 
        requestAnimationFrame(() => {
          const errorMessage = rpcError.message || 'Erro ao carregar equipes via RPC.';
          toast.error(errorMessage);
        });
        setLoading(false);
        return;
      }

      console.log('Equipes com contagem recebidas da RPC (sem erro detectado):', teamsWithCounts);

      if (teamsWithCounts && teamsWithCounts.length > 0) {
        setTeams(teamsWithCounts);
        setFilteredTeams(teamsWithCounts);
          } else {
        console.log('Nenhuma equipe encontrada pela RPC para esta organização');
        setTeams([]);
        setFilteredTeams([]);
      }

    } catch (error) {
      console.error('Erro geral ao carregar equipes:', error);
      requestAnimationFrame(() => {
        toast.error('Ocorreu um erro inesperado ao carregar as equipes.');
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTeams = () => {
    if (!teams.length) {
      setFilteredTeams([])
      return
    }
    
    let filtered = [...teams]
    
    if (searchQuery) {
      filtered = filtered.filter(team => 
        team.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    
    setFilteredTeams(filtered)
  }

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      setTimeout(() => {
        toast.error('Por favor, digite um nome para a equipe')
      }, 0)
      return
    }
    
    if (!organization) {
      setTimeout(() => {
        toast.error('Organização não encontrada')
      }, 0)
      return
    }

    setCreatingTeam(true)
    
    try {
      const response = await fetch('/api/teams/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTeamName.trim(),
          organizationId: organization.id
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Erro ao criar equipe');
      }
      
      setNewTeamName('');
      setShowCreateTeamDialog(false);
      setCreatingTeam(false);
      
      requestAnimationFrame(() => {
        toast.success('Equipe criada com sucesso!');
        
        loadOrganizationAndTeams();
      });
      
    } catch (error) {
      console.error('Erro ao criar equipe:', error);
      setCreatingTeam(false);
      
      requestAnimationFrame(() => {
        toast.error(error instanceof Error ? error.message : 'Não foi possível criar a equipe');
      });
    }
  }

  const handleTeamSettings = (teamId: string) => {
    router.push(`/app/organizador/equipes/${teamId}/configuracoes`)
  }

  const handleAssociateTeamByCode = async () => {
    if (!associationCode.trim() || !organization?.id) {
      toast.error("Código da equipa ou organização inválida.");
      return;
    }
    setAssociatingTeam(true);

    const formData = new FormData();
    formData.append('teamCode', associationCode.trim());
    formData.append('organizationId', organization.id);

    const result = await associateTeamAction(formData);

    if (result.success) {
       toast.success(result.message + ` (Nome: ${result.teamName || 'desconhecido'})`);
       setAssociationCode('');
       setShowCallTeamDialog(false);
       loadOrganizationAndTeams();
    } else {
       toast.error(result.message);
    }

    setAssociatingTeam(false);
  }

  if (loading && teams.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
            <h3 className="text-xl font-medium">Carregando equipes...</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Equipes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as equipes vinculadas à sua organização
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
            <DialogTrigger asChild>
              <Button className={colors.primary}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Equipa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Equipe</DialogTitle>
                <DialogDescription>
                  Digite um nome para sua nova equipe. Um código único será gerado automaticamente.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <label htmlFor="team-name" className="text-sm font-medium block mb-2">
                  Nome da Equipe
                  </label>
                  <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Digite o nome da equipe"
                  className="mb-2"
                  />
                </div>
                
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateTeamDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTeam} disabled={creatingTeam} className={colors.primary}>
                  {creatingTeam ? "Criando..." : "Criar Equipe"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCallTeamDialog} onOpenChange={setShowCallTeamDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="hover:border-fuchsia-500 hover:text-fuchsia-600">
                <Users className="mr-2 h-4 w-4" />
                Chamar equipa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Associar Equipa Existente</DialogTitle>
                <DialogDescription>
                  Insira o código da equipa que deseja associar a esta organização ({organization?.name || '...'}). A equipa não pode pertencer a outra organização.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-2">
                 <Label htmlFor="team-code-associate">Código da Equipa</Label>
                    <Input
                   id="team-code-associate"
                   value={associationCode}
                   onChange={(e) => setAssociationCode(e.target.value.toUpperCase())}
                   placeholder="Ex: TEAM-XXXX"
                   disabled={associatingTeam}
                 />
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => { setShowCallTeamDialog(false); setAssociationCode(''); }} 
                  disabled={associatingTeam}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => handleAssociateTeamByCode()} 
                  disabled={!associationCode.trim() || associatingTeam}
                  className={colors.accent}
                >
                  {associatingTeam ? "Associando..." : "Associar Equipa"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-lime-500" />
            <Input
              placeholder="Buscar equipes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      {filteredTeams.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center">
          <Users className="h-12 w-12 text-fuchsia-400 mb-4" />
          {searchQuery ? (
            <>
              <h3 className="text-xl font-medium mb-2">Nenhuma equipe encontrada</h3>
              <p className="text-muted-foreground text-center">
                Não encontramos nenhuma equipe com "{searchQuery}". Tente outra busca.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-medium mb-2">Nenhuma equipe vinculada</h3>
              <p className="text-muted-foreground text-center mb-6">
                Você ainda não tem equipes vinculadas à sua organização.
              </p>
              <Button onClick={() => setShowCreateTeamDialog(true)} className={colors.primary}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Criar Primeira Equipe
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-all border-l-4 border-l-lime-500">
              <CardHeader className="pb-3 text-center">
                <CardTitle className="text-gray-900">{team.name}</CardTitle>
                <CardDescription className="flex items-center justify-center">
                  <Users className="h-4 w-4 mr-1" />
                  {team.member_count} membro{team.member_count !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-center">
                  <div>
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <span className="font-mono ml-2 font-semibold">{team.team_code}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTeamSettings(team.id)}
                  className="w-2/3 hover:border-lime-500 hover:text-lime-600"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 