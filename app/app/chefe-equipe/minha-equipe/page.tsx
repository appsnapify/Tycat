"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Trash2, 
  UserPlus, 
  Users, 
  User, 
  Settings, 
  Copy, 
  Check,
  CreditCard,
  Pencil
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { toast } from 'sonner'

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
  member_count: number
  created_at: string
}

export default function MinhaEquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
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
  
  useEffect(() => {
    if (user) {
      loadTeamData()
    }
  }, [user])
  
  const loadTeamData = async () => {
    setLoading(true)
    try {
      if (!user || !user.id) {
        console.log("Usuário não autenticado");
        return;
      }
      
      console.log("Carregando dados da equipe para:", user.id);
      
      // Verificar nos metadados do usuário primeiro
      if (user.user_metadata?.team_id) {
        const teamId = user.user_metadata.team_id;
        console.log("ID da equipe encontrado nos metadados:", teamId);
        
        // Carregar dados da equipe
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, description, team_code, logo_url, created_by, created_at')
          .eq('id', teamId)
          .single();
        
        if (teamError) {
          console.error("Erro ao carregar detalhes da equipe:", teamError);
          
          // Usar dados básicos dos metadados como fallback
          setTeam({
            id: teamId,
            name: user.user_metadata.team_name || "Minha Equipe",
            description: "Detalhes indisponíveis no momento",
            team_code: user.user_metadata.team_code || "EQUIPE",
            logo_url: null,
            created_by: user.id,
            member_count: 1,
            created_at: new Date().toISOString()
          });
        } else if (teamData) {
          console.log("Detalhes da equipe carregados:", teamData);
          
          // Contar membros da equipe
          const { count, error: countError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamId);
          
          const memberCount = countError ? 1 : (count || 1);
          
          // Configurar equipe com contagem de membros
          setTeam({
            ...teamData,
            member_count: memberCount
          });
        }
        
        // Carregar membros
        await loadTeamMembers(teamId);
        return;
      }
      
      // Se não tem nos metadados, tenta verificar se é líder de alguma equipe
      console.log("Verificando se usuário é líder de alguma equipe");
      const { data: teamMember, error: teamMemberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id)
        .eq('role', 'leader')
        .single();
      
      if (teamMemberError && teamMemberError.code !== 'PGRST116') {
        console.error("Erro ao verificar liderança:", teamMemberError);
      }
      
      if (teamMember) {
        console.log("Encontrado como líder da equipe:", teamMember.team_id);
        
        // Carregar detalhes da equipe
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, description, team_code, logo_url, created_by, created_at')
          .eq('id', teamMember.team_id)
          .single();
        
        if (teamError) {
          console.error("Erro ao carregar equipe:", teamError);
          throw teamError;
        }
        
        if (teamData) {
          // Contar membros
          const { count, error: countError } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', teamMember.team_id);
          
          const memberCount = countError ? 1 : (count || 1);
          
          setTeam({
            ...teamData,
            member_count: memberCount
          });
          
          await loadTeamMembers(teamData.id);
          return;
        }
      }
      
      // Verificar se é criador de alguma equipe
      console.log("Verificando se é criador de alguma equipe");
      const { data: ownedTeam, error: ownedTeamError } = await supabase
        .from('teams')
        .select('id, name, description, team_code, logo_url, created_by, created_at')
        .eq('created_by', user.id)
        .single();
      
      if (ownedTeamError && ownedTeamError.code !== 'PGRST116') {
        console.error("Erro ao verificar equipes criadas:", ownedTeamError);
      }
      
      if (ownedTeam) {
        console.log("Encontrado como criador da equipe:", ownedTeam.id);
        
        // Contar membros
        const { count, error: countError } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', ownedTeam.id);
        
        const memberCount = countError ? 1 : (count || 1);
        
        setTeam({
          ...ownedTeam,
          member_count: memberCount
        });
        
        await loadTeamMembers(ownedTeam.id);
        return;
      }
      
      // Se chegou aqui, não tem equipe
      console.log("Usuário não tem equipe. Redirecionando...");
      setTimeout(() => {
        router.push('/app/chefe-equipe/criar-equipe');
      }, 100);
      
    } catch (error) {
      console.error('Erro ao carregar dados da equipe:', error);
      toast.error('Não foi possível carregar os dados da equipe.');
    } finally {
      setLoading(false);
    }
  };
  
  const loadTeamMembers = async (teamId: string) => {
    try {
      console.log("Carregando membros para equipe:", teamId);
      
      // Consulta simplificada sem joins
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('id, user_id, role, commission_rate')
        .eq('team_id', teamId);
      
      if (membersError) {
        console.error("Erro ao carregar membros:", membersError);
        throw membersError;
      }
      
      if (!membersData || membersData.length === 0) {
        console.log("Nenhum membro encontrado");
        
        // Adicionar pelo menos o usuário atual
        if (user) {
          setMembers([{
            id: 'current-user',
            role: 'leader',
            user_id: user.id,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Você',
            email: user.email || '',
            commission_rate: null
          }]);
        } else {
          setMembers([]);
        }
        return;
      }
      
      console.log(`Encontrados ${membersData.length} membros na equipe`);
      
      // Processar dados sem JOIN complexo
      const processedMembers = membersData.map(member => {
        const isCurrentUser = member.user_id === user?.id;
        
        return {
          id: member.id,
          role: member.role,
          user_id: member.user_id,
          name: isCurrentUser ? (user.user_metadata?.name || user.email?.split('@')[0] || 'Você') : `Membro ${member.id.slice(0, 4)}`,
          email: isCurrentUser ? (user.email || '') : `membro-${member.id.slice(0, 8)}@equipe.com`,
          commission_rate: member.commission_rate
        };
      });
      
      console.log("Membros processados:", processedMembers.length);
      setMembers(processedMembers);
      
      // Tentar melhorar os dados com uma segunda consulta assíncrona
      setTimeout(() => {
        enhanceMembersData(membersData, teamId);
      }, 0);
      
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      
      // Garantir que pelo menos o usuário atual seja listado
      if (user) {
        setMembers([{
          id: 'current-user',
          role: 'leader',
          user_id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Você',
          email: user.email || '',
          commission_rate: null
        }]);
      }
    }
  };
  
  // Função separada para evitar erro de atualização de estado durante renderização
  const enhanceMembersData = async (membersData: any[], teamId: string) => {
    try {
      // Apenas obter IDs dos usuários
      const userIds = membersData.map(member => member.user_id);
      
      // Tentar obter emails dos usuários
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (usersError) {
        console.warn("Não foi possível carregar detalhes dos usuários:", usersError);
        return;
      }
      
      if (!usersData || usersData.length === 0) {
        console.log("Nenhum dado de usuário encontrado para enriquecer membros");
        return;
      }
      
      // Enriquecer dados dos membros
      const enhancedMembers = members.map(member => {
        const userData = usersData.find(u => u.id === member.user_id);
        
        if (!userData) return member;
        
        return {
          ...member,
          name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : member.name,
          email: userData.email || member.email
        };
      });
      
      console.log("Dados de membros enriquecidos:", enhancedMembers.length);
      setMembers(enhancedMembers);
      
    } catch (error) {
      console.error("Erro ao enriquecer dados dos membros:", error);
    }
  };
  
  const copyTeamCode = () => {
    if (!team) return
    
    navigator.clipboard.writeText(team.team_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código da equipe copiado para a área de transferência')
  }
  
  const addPromoter = async () => {
    if (!newPromoterEmail.trim() || !team) {
      toast.error('Por favor, insira um email válido.')
      return
    }
    
    setAddingPromoter(true)
    
    try {
      // 1. Verificar se o usuário existe
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', newPromoterEmail.trim())
        .maybeSingle()
        
      if (userError) throw userError
      
      if (!userData) {
        toast.error('Usuário não encontrado. O promotor precisa estar cadastrado no sistema.')
        return
      }
      
      // 2. Verificar se o usuário já é membro da equipe
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
      
      // 3. Adicionar usuário como promotor
      const { error: addError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: userData.id,
          role: 'promoter',
          commission_rate: customRate > 0 ? customRate : null,
          joined_at: new Date().toISOString()
        })
        
      if (addError) throw addError
      
      toast.success('Promotor adicionado com sucesso!')
      setShowAddPromoter(false)
      setNewPromoterEmail('')
      setCustomRate(0)
      
      // Recarregar membros da equipe
      await loadTeamMembers(team.id)
      
    } catch (error) {
      console.error('Erro ao adicionar promotor:', error)
      toast.error('Erro ao adicionar promotor. Tente novamente.')
    } finally {
      setAddingPromoter(false)
    }
  }
  
  const removeMember = async (memberId: string, memberName: string) => {
    if (!team) return
    
    if (!confirm(`Tem certeza que deseja remover ${memberName} da equipe?`)) {
      return
    }
    
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
        
      if (error) throw error
      
      toast.success(`${memberName} foi removido da equipe.`)
      
      // Atualizar a lista de membros
      setMembers(prev => prev.filter(member => member.id !== memberId))
      
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      toast.error('Erro ao remover membro. Tente novamente.')
    }
  }
  
  const updateMemberRate = async () => {
    if (!editingMember || !team) return
    
    setUpdating(true)
    
    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          commission_rate: editRate > 0 ? editRate : null
        })
        .eq('id', editingMember.id)
        
      if (error) throw error
      
      toast.success('Taxa de comissão atualizada com sucesso!')
      
      // Atualizar membro na lista local
      setMembers(prev => prev.map(member => 
        member.id === editingMember.id 
          ? { ...member, commission_rate: editRate > 0 ? editRate : null } 
          : member
      ))
      
      setEditingMember(null)
      
    } catch (error) {
      console.error('Erro ao atualizar taxa de comissão:', error)
      toast.error('Erro ao atualizar taxa de comissão. Tente novamente.')
    } finally {
      setUpdating(false)
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Minha Equipe</h1>
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center space-y-4">
            <Users className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-xl font-medium">Carregando dados da equipe...</h3>
          </div>
        </div>
      </div>
    )
  }
  
  if (!team) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Minha Equipe</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Você ainda não tem uma equipe</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Para começar, crie sua equipe e convide promotores para se juntar a você.
            </p>
            <Link href="/app/chefe-equipe/criar-equipe">
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Criar Minha Equipe
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Minha Equipe</h1>
      
      {/* Detalhes da Equipe */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{team.name}</CardTitle>
              <CardDescription className="mt-1">
                Criada em {formatDate(team.created_at)}
              </CardDescription>
            </div>
            <Link href="/app/chefe-equipe/configuracoes">
              <Button variant="outline" size="sm" className="h-9">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {team.description && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Descrição</h3>
                <p>{team.description}</p>
              </div>
            )}
            
            <div className="bg-muted/50 rounded-lg p-4 flex flex-col md:flex-row justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Código da Equipe</h3>
                <div className="flex items-center">
                  <Badge variant="outline" className="text-lg font-mono px-3 py-1">
                    {team.team_code}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={copyTeamCode} 
                    className="ml-2"
                    title="Copiar código"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Compartilhe este código com organizadores para vincular sua equipe aos eventos deles.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Estatísticas</h3>
                <div className="flex items-center gap-6">
                  <div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="font-medium">{team.member_count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Membros</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center">
                      <CreditCard className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="font-medium">0</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Comissões pendentes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de Membros */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Membros da Equipe</h2>
        
        <Dialog open={showAddPromoter} onOpenChange={setShowAddPromoter}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Adicionar Promotor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Promotor</DialogTitle>
              <DialogDescription>
                Insira o email do usuário que deseja adicionar como promotor à sua equipe.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Promotor</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="exemplo@email.com"
                  value={newPromoterEmail}
                  onChange={(e) => setNewPromoterEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O promotor já deve estar cadastrado no sistema.
                </p>
              </div>
              
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <Label>Taxa de Comissão Personalizada</Label>
                  <span className="text-sm">{customRate}%</span>
                </div>
                <Slider
                  value={[customRate]}
                  min={0}
                  max={90}
                  step={5}
                  onValueChange={(value) => setCustomRate(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  0% = Taxa padrão da organização. Defina uma porcentagem para criar uma taxa personalizada para este promotor.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowAddPromoter(false)}
                disabled={addingPromoter}
              >
                Cancelar
              </Button>
              <Button 
                onClick={addPromoter}
                disabled={addingPromoter || !newPromoterEmail.trim()}
              >
                {addingPromoter ? 'Adicionando...' : 'Adicionar Promotor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Dialog 
          open={!!editingMember} 
          onOpenChange={(open) => !open && setEditingMember(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Taxa de Comissão</DialogTitle>
              <DialogDescription>
                Defina uma taxa de comissão personalizada para {editingMember?.name}.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Taxa de Comissão</Label>
                  <span className="text-sm">{editRate}%</span>
                </div>
                <Slider
                  value={[editRate]}
                  min={0}
                  max={90}
                  step={5}
                  onValueChange={(value) => setEditRate(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  0% = Taxa padrão da organização. Defina uma porcentagem para criar uma taxa personalizada.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingMember(null)}
                disabled={updating}
              >
                Cancelar
              </Button>
              <Button 
                onClick={updateMemberRate}
                disabled={updating}
              >
                {updating ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum membro na equipe</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Adicione promotores à sua equipe para começar a gerar comissões.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {members.map((member) => (
                <div key={member.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarFallback>
                        {member.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <div className="flex items-center">
                        <h3 className="font-medium">{member.name}</h3>
                        <Badge 
                          variant={member.role === 'leader' ? 'default' : 'outline'}
                          className="ml-2"
                        >
                          {member.role === 'leader' ? 'Líder' : 'Promotor'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {member.commission_rate && (
                      <Badge variant="secondary">
                        Taxa: {member.commission_rate}%
                      </Badge>
                    )}
                    
                    {member.role === 'promoter' && (
                      <>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingMember(member)
                            setEditRate(member.commission_rate || 0)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeMember(member.id, member.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remover</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 