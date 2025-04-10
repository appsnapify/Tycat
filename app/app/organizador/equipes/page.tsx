"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { 
  PlusCircle, 
  Search, 
  Users, 
  Copy, 
  Check, 
  CreditCard, 
  Settings,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

interface Team {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  team_code: string
  member_count: number
  commission_type: string
  commission_settings: any
  created_at: string
  total_pending: number | null
  total_paid: number | null
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
  const [tabValue, setTabValue] = useState('all')
  const [copied, setCopied] = useState(false)
  const [showAddTeamDialog, setShowAddTeamDialog] = useState(false)
  const [teamCodeInput, setTeamCodeInput] = useState('')
  const [commissionType, setCommissionType] = useState('percentage')
  const [commissionRate, setCommissionRate] = useState('10')
  const [teamSplit, setTeamSplit] = useState('30')
  const [promoterSplit, setPromoterSplit] = useState('70')
  const [validationError, setValidationError] = useState('')
  const [organizationCode, setOrganizationCode] = useState('')

  useEffect(() => {
    if (user) {
      loadOrganizationAndTeams()
    }
  }, [user])

  useEffect(() => {
    filterTeams()
  }, [teams, searchQuery, tabValue])

  const loadOrganizationAndTeams = async () => {
    setLoading(true)
    try {
      // Carregar organização atual
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('role', 'owner')
        .single()

      if (orgError) {
        console.error('Erro ao carregar organização:', orgError)
        toast.error('Não foi possível carregar a organização.')
        setLoading(false)
        return
      }
      
      if (!orgData || !orgData.organization_id) {
        toast.error('Organização não encontrada.')
        setLoading(false)
        return
      }
      
      const organizationId = orgData.organization_id
      
      // Buscar detalhes da organização
      const { data: orgDetailsData, error: orgDetailsError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', organizationId)
        .single()
        
      if (orgDetailsError) {
        console.error('Erro ao carregar detalhes da organização:', orgDetailsError)
        setLoading(false)
        return
      }
      
      // Montar objeto da organização
      const org = {
        id: orgDetailsData.id,
        name: orgDetailsData.name,
        slug: orgDetailsData.slug || 'org'
      }
      
      // Usar setTimeout para evitar erro de atualização durante renderização
      setTimeout(() => {
        setOrganization(org)
        
        // Gerar código de organização
        const code = `ORG-${org.slug.substring(0, 5).toUpperCase()}`
        setOrganizationCode(code)
      }, 0)
      
      // Buscar equipes vinculadas usando a função RPC
      try {
        const { data: teamsData, error: teamsError } = await supabase
          .rpc('get_organization_teams_with_details', { org_id: organizationId })
        
        if (teamsError) {
          console.error('Erro ao carregar equipes:', teamsError)
          toast.error('Não foi possível carregar as equipes. Tente novamente mais tarde.')
          setLoading(false)
          return
        }
        
        // Usar setTimeout para evitar erro de atualização durante renderização
        setTimeout(() => {
          if (teamsData && teamsData.length > 0) {
            // Formatar dados das equipes para garantir compatibilidade
            const formattedTeams = teamsData.map(team => ({
              id: team.id || '',
              name: team.name || 'Equipa sem nome',
              description: team.description || null,
              logo_url: team.logo_url || null,
              team_code: team.code || 'CÓDIGO',
              member_count: team.member_count || 0,
              commission_type: team.commission_type || 'percentage',
              commission_settings: {
                rate: team.commission_rate || 10,
                fixed_amount: team.fixed_amount || 0,
                tiers: team.tiers || null,
                team_promoter_split: team.team_promoter_split || 30
              },
              created_at: team.created_at || new Date().toISOString(),
              total_pending: team.total_pending || null,
              total_paid: team.total_paid || null
            }));
            
            setTeams(formattedTeams)
            setFilteredTeams(formattedTeams)
          } else {
            setTeams([])
            setFilteredTeams([])
          }
          setLoading(false)
        }, 0)
      } catch (e) {
        console.error('Erro ao processar equipes:', e)
        toast.error('Erro ao processar dados das equipes.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Não foi possível carregar as equipes.')
      setLoading(false)
    }
  }

  const filterTeams = () => {
    let result = [...teams]
    
    // Filtrar por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(team => 
        team.name.toLowerCase().includes(query) || 
        team.team_code.toLowerCase().includes(query)
      )
    }
    
    // Filtrar por tab
    if (tabValue === 'pending') {
      result = result.filter(team => (team.total_pending || 0) > 0)
    }
    
    setFilteredTeams(result)
  }

  const copyOrganizationCode = () => {
    navigator.clipboard.writeText(organizationCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Código copiado para a área de transferência')
  }

  const validateTeamCode = (code: string) => {
    if (!code.trim()) {
      setValidationError('O código da equipe é obrigatório')
      return false
    }
    
    if (!code.trim().startsWith('TEAM-')) {
      setValidationError('Código inválido. O formato correto é TEAM-XXXXX')
      return false
    }
    
    setValidationError('')
    return true
  }

  const handleAddTeam = async () => {
    if (!validateTeamCode(teamCodeInput)) {
      return
    }
    
    if (!organization) {
      toast.error('Nenhuma organização selecionada')
      return
    }

    setLoading(true)
    try {
      // Verificar se o código da equipe existe
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('team_code', teamCodeInput.trim())
        .single()

      if (teamError) {
        setValidationError('Equipe não encontrada. Verifique o código.')
        setLoading(false)
        return
      }
      
      // Verificar se a equipe já está vinculada
      const { data: existingLink, error: linkError } = await supabase
        .from('organization_teams')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('team_id', teamData.id)
        .single()

      if (existingLink) {
        setValidationError('Esta equipe já está vinculada à sua organização')
        setLoading(false)
        return
      }
      
      // Converter valores para números
      const rateValue = parseFloat(commissionRate)
      const teamSplitValue = parseFloat(teamSplit)
      const promoterSplitValue = parseFloat(promoterSplit)
      
      // Validar valores
      if (teamSplitValue + promoterSplitValue !== 100) {
        setValidationError('A soma dos percentuais deve ser 100%')
        setLoading(false)
        return
      }
      
      // Criar configurações de comissão baseadas no tipo
      let commissionSettings = {}
      
      if (commissionType === 'percentage') {
        commissionSettings = {
          rate: rateValue,
          team_split: teamSplitValue,
          promoter_split: promoterSplitValue
        }
      } else if (commissionType === 'fixed') {
        commissionSettings = {
          fixed_amount: rateValue,
          team_split: teamSplitValue,
          promoter_split: promoterSplitValue
        }
      } else if (commissionType === 'tiered') {
        commissionSettings = {
          rate: rateValue,
          team_split: teamSplitValue,
          promoter_split: promoterSplitValue,
          tiers: [
            { threshold: 0, rate: rateValue },
            { threshold: 10, rate: rateValue + 2 },
            { threshold: 20, rate: rateValue + 5 }
          ]
        }
      }
      
      // Vincular equipe à organização
      const { error: insertError } = await supabase
        .from('organization_teams')
        .insert({
          organization_id: organization.id,
          team_id: teamData.id,
          commission_type: commissionType,
          commission_settings: commissionSettings,
          is_active: true
        })

      if (insertError) throw insertError
      
      toast.success(`Equipe ${teamData.name} adicionada com sucesso!`)
      setShowAddTeamDialog(false)
      
      // Recarregar equipes
      loadOrganizationAndTeams()
      
    } catch (error) {
      console.error('Erro ao adicionar equipe:', error)
      toast.error('Não foi possível adicionar a equipe')
    } finally {
      setLoading(false)
    }
  }

  const handlePayCommission = (teamId: string, teamName: string) => {
    // Redirecionar para página de pagamento de comissão
    router.push(`/app/organizador/comissoes/pagar?team=${teamId}&name=${encodeURIComponent(teamName)}`)
  }

  const handleTeamSettings = (teamId: string) => {
    // Redirecionar para página de configurações da equipe
    router.push(`/app/organizador/equipes/${teamId}/configuracoes`)
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '€0,00'
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value)
  }

  const commissionTypeDisplay = (type: string) => {
    switch (type) {
      case 'percentage': return 'Percentual'
      case 'fixed': return 'Valor Fixo'
      case 'tiered': return 'Patamares'
      default: return type
    }
  }

  const getCommissionRateDisplay = (team: Team) => {
    if (team.commission_type === 'percentage') {
      return `${team.commission_settings.rate}%`
    } else if (team.commission_type === 'fixed') {
      return formatCurrency(team.commission_settings.fixed_amount)
    } else {
      return `${team.commission_settings.rate}%+`
    }
  }

  if (loading && teams.length === 0) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Users className="h-12 w-12 text-muted-foreground/50" />
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
          <div className="border rounded-lg p-2 flex items-center gap-2 bg-card">
            <span className="text-sm font-medium">Código da Organização:</span>
            <Badge variant="secondary" className="font-mono">{organizationCode}</Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={copyOrganizationCode}
              title="Copiar código"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <Dialog open={showAddTeamDialog} onOpenChange={setShowAddTeamDialog}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Equipe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Equipe</DialogTitle>
                <DialogDescription>
                  Insira o código da equipe que deseja adicionar à sua organização.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <label htmlFor="team-code" className="text-sm font-medium">
                    Código da Equipe
                  </label>
                  <Input
                    id="team-code"
                    placeholder="TEAM-XXXXX"
                    value={teamCodeInput}
                    onChange={(e) => setTeamCodeInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    O código é fornecido pelo líder da equipe.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Comissão</label>
                  <Select 
                    value={commissionType} 
                    onValueChange={setCommissionType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo de comissão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual</SelectItem>
                      <SelectItem value="fixed">Valor Fixo</SelectItem>
                      <SelectItem value="tiered">Patamares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {commissionType === 'percentage' && 'Taxa (%)'}
                    {commissionType === 'fixed' && 'Valor (€)'}
                    {commissionType === 'tiered' && 'Taxa Base (%)'}
                  </label>
                  <Input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      % para Equipe
                    </label>
                    <Input
                      type="number"
                      value={teamSplit}
                      onChange={(e) => {
                        setTeamSplit(e.target.value)
                        // Calcular automaticamente o outro valor
                        const newValue = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        setPromoterSplit((100 - newValue).toString())
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      % para Promotor
                    </label>
                    <Input
                      type="number"
                      value={promoterSplit}
                      onChange={(e) => {
                        setPromoterSplit(e.target.value)
                        // Calcular automaticamente o outro valor
                        const newValue = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0))
                        setTeamSplit((100 - newValue).toString())
                      }}
                    />
                  </div>
                </div>
                
                {validationError && (
                  <div className="bg-destructive/10 p-3 rounded-md flex items-start">
                    <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
                    <span className="text-sm text-destructive">{validationError}</span>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddTeamDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddTeam} disabled={loading}>
                  {loading ? "Adicionando..." : "Adicionar Equipe"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar equipes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs defaultValue="all" className="w-full" onValueChange={setTabValue}>
            <TabsList>
              <TabsTrigger value="all">Todas as Equipes</TabsTrigger>
              <TabsTrigger value="pending">Comissões Pendentes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      
      {filteredTeams.length === 0 ? (
        <div className="bg-card border rounded-lg p-12 flex flex-col items-center justify-center">
          <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
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
                Adicione equipes usando o código fornecido pelo líder.
              </p>
              <Button onClick={() => setShowAddTeamDialog(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Primeira Equipe
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <CardTitle>{team.name}</CardTitle>
                <CardDescription className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {team.member_count} membro{team.member_count !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Código:</span>
                    <span className="font-mono ml-2">{team.team_code}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      <span className="text-sm text-muted-foreground">Comissão:</span>
                      <span className="ml-2">{commissionTypeDisplay(team.commission_type)}</span>
                    </div>
                    <Badge variant="outline">
                      {getCommissionRateDisplay(team)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-muted rounded-md p-3 text-center">
                      <h4 className="text-xs text-muted-foreground">Pendente</h4>
                      <p className="font-medium">
                        {formatCurrency(team.total_pending || 0)}
                      </p>
                    </div>
                    <div className="bg-muted rounded-md p-3 text-center">
                      <h4 className="text-xs text-muted-foreground">Total Pago</h4>
                      <p className="font-medium">
                        {formatCurrency(team.total_paid || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTeamSettings(team.id)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button 
                  size="sm"
                  disabled={(team.total_pending || 0) <= 0}
                  onClick={() => handlePayCommission(team.id, team.name)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pagar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 