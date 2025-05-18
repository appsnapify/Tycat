"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DatePickerWithRange } from '@/components/date-range-picker'
import { 
  AlertCircle, 
  Building, 
  CreditCard, 
  ChevronsUpDown, 
  Check, 
  CheckCircle, 
  Clock, 
  CalendarRange,
  Users,
  Plus
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface Team {
  id: string
  name: string
  total_pending: number
  total_paid: number
}

interface Commission {
  id: string
  team_id: string
  team_name: string
  event_id: string
  event_name: string
  promoter_id: string | null
  promoter_name: string | null
  guest_id: string | null
  ticket_reference: string | null
  amount: number
  team_amount: number
  promoter_amount: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
}

export default function ComissoesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const showSuccess = searchParams.get('success') === 'true'
  
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  })
  
  useEffect(() => {
    if (user) {
      fetchTeams()
    }
  }, [user])
  
  useEffect(() => {
    if (user) {
      fetchCommissions()
    }
  }, [user, selectedTeam, selectedStatus, dateRange])
  
  useEffect(() => {
    if (showSuccess) {
      toast.success('Pagamento de comissões realizado com sucesso!')
      
      // Remover o parâmetro da URL sem recarregar a página
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url)
    }
  }, [showSuccess])
  
  const fetchTeams = async () => {
    try {
      // Obter organização do usuário
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('role', 'owner')
        .single()
        
      if (orgError) {
        console.error('Erro ao obter organização:', orgError)
        return
      }
      
      const organizationId = orgData.organization_id
      
      // Usar a função RPC do Supabase
      const { data, error } = await supabase
        .rpc('get_commission_data', { org_id: organizationId })
        
      if (error) {
        console.error('Erro ao carregar equipes:', error)
        return
      }
      
      if (data && data.teams) {
        setTeams(data.teams)
      }
      
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
    }
  }
  
  const fetchCommissions = async () => {
    setLoading(true)
    try {
      // Obter organização do usuário
      const { data: orgData, error: orgError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('role', 'owner')
        .single()
        
      if (orgError) {
        console.error('Erro ao obter organização:', orgError)
        setLoading(false)
        return
      }
      
      const organizationId = orgData.organization_id
      
      // Usar a função RPC do Supabase
      const { data, error } = await supabase
        .rpc('get_commission_data', { org_id: organizationId })
        
      if (error) {
        console.error('Erro ao carregar comissões:', error)
        setLoading(false)
        return
      }
      
      if (data) {
        // Aplicar filtros aos dados recebidos
        let filteredCommissions = data.commissions || []
        
        if (selectedTeam !== 'all') {
          filteredCommissions = filteredCommissions.filter(c => c.team_id === selectedTeam)
        }
        
        if (selectedStatus !== 'all') {
          filteredCommissions = filteredCommissions.filter(c => c.status === selectedStatus)
        }
        
        // Filtrar por data - simulando filtro de datas
        const fromDate = dateRange.from.getTime()
        const toDate = dateRange.to.getTime()
        
        filteredCommissions = filteredCommissions.filter(commission => {
          const commissionDate = new Date(commission.created_at).getTime()
          return commissionDate >= fromDate && commissionDate <= toDate
        })
        
        // Usar setTimeout para evitar erro de atualização durante renderização
        setTimeout(() => {
          setCommissions(filteredCommissions)
          setLoading(false)
        }, 0)
      } else {
        setLoading(false)
      }
      
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      setLoading(false)
    }
  }
  
  const handlePayTeam = (teamId: string, teamName: string) => {
    router.push(`/app/organizador/comissoes/pagar?team=${teamId}&name=${encodeURIComponent(teamName)}`)
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { 
      style: 'currency', 
      currency: 'EUR' 
    }).format(value)
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Pendente</span>
        </Badge>
      case 'paid':
        return <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>Paga</span>
        </Badge>
      case 'cancelled':
        return <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>Cancelada</span>
        </Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }
  
  // Calcular totais
  const calculateTotals = () => {
    const total = commissions.reduce((acc, commission) => acc + commission.amount, 0)
    const totalTeams = commissions.reduce((acc, commission) => acc + commission.team_amount, 0)
    const totalPromoters = commissions.reduce((acc, commission) => acc + commission.promoter_amount, 0)
    
    return {
      total,
      totalTeams,
      totalPromoters
    }
  }
  
  const totals = calculateTotals()
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Comissões</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as comissões de equipes e promotores
        </p>
      </div>
      
      {/* Resumo de Equipes */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Resumo por Equipe</h2>
        
        {teams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Sem equipes vinculadas</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                Você ainda não tem equipes vinculadas à sua organização. Adicione equipes para começar a gerenciar comissões.
              </p>
              <Link href="/app/organizador/equipes/adicionar">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Equipe
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <CardTitle>{team.name}</CardTitle>
                  <CardDescription>Resumo financeiro</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">Pendente</p>
                        <p className="text-lg font-bold">{formatCurrency(team.total_pending)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Pago</p>
                        <p className="text-lg font-bold">{formatCurrency(team.total_paid)}</p>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handlePayTeam(team.id, team.name)}
                      disabled={team.total_pending <= 0}
                      className="w-full"
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pagar Comissões
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Lista de Comissões */}
      <div>
        <Tabs defaultValue="lista" className="w-full">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-4 gap-4">
            <TabsList>
              <TabsTrigger value="lista">Lista</TabsTrigger>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por equipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              
              <DatePickerWithRange 
                date={dateRange}
                setDate={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to })
                  }
                }}
                className="w-full md:w-auto"
              />
            </div>
          </div>
          
          <TabsContent value="lista" className="mt-0">
            <Card>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-4">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-[250px]" />
                          <Skeleton className="h-4 w-[150px]" />
                        </div>
                        <Skeleton className="h-4 w-[100px]" />
                      </div>
                    ))}
                  </div>
                ) : commissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhuma comissão encontrada</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Não foram encontradas comissões com os filtros selecionados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Equipe</TableHead>
                          <TableHead>Promotor</TableHead>
                          <TableHead>Referência</TableHead>
                          <TableHead className="text-right">Valor Total</TableHead>
                          <TableHead className="text-right">Equipe</TableHead>
                          <TableHead className="text-right">Promotor</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell className="font-medium">
                              {formatDate(commission.created_at)}
                            </TableCell>
                            <TableCell>{commission.event_name}</TableCell>
                            <TableCell>{commission.team_name}</TableCell>
                            <TableCell>
                              {commission.promoter_name || 'Direto'}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono">
                                {commission.ticket_reference || '-'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(commission.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(commission.team_amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(commission.promoter_amount)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(commission.status)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <ChevronsUpDown className="h-4 w-4" />
                                    <span className="sr-only">Ações</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem disabled={commission.status !== 'pending'}>
                                    <Check className="mr-2 h-4 w-4" />
                                    Marcar como paga
                                  </DropdownMenuItem>
                                  <DropdownMenuItem disabled={commission.status !== 'pending'}>
                                    <AlertCircle className="mr-2 h-4 w-4" />
                                    Cancelar comissão
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="resumo" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Período</CardTitle>
                <CardDescription>
                  {dateRange.from && dateRange.to ? (
                    <>
                      De {formatDate(dateRange.from.toISOString())} até {formatDate(dateRange.to.toISOString())}
                    </>
                  ) : (
                    'Selecione um período'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Resumo Geral */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col p-4 border rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Gerado</span>
                      <span className="text-2xl font-bold mt-2">{formatCurrency(totals.total)}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Valor total de comissões no período
                      </span>
                    </div>
                    <div className="flex flex-col p-4 border rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Equipes</span>
                      <span className="text-2xl font-bold mt-2">{formatCurrency(totals.totalTeams)}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Parte destinada às equipes
                      </span>
                    </div>
                    <div className="flex flex-col p-4 border rounded-lg">
                      <span className="text-sm text-muted-foreground">Total Promotores</span>
                      <span className="text-2xl font-bold mt-2">{formatCurrency(totals.totalPromoters)}</span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Parte destinada aos promotores
                      </span>
                    </div>
                  </div>
                  
                  {/* Resumo por Status */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Por Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {['pending', 'paid', 'cancelled'].map(status => {
                        const filteredByStatus = commissions.filter(c => c.status === status)
                        const totalAmount = filteredByStatus.reduce((acc, c) => acc + c.amount, 0)
                        const totalTeamAmount = filteredByStatus.reduce((acc, c) => acc + c.team_amount, 0)
                        
                        return (
                          <div key={status} className="flex flex-col p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium">
                                {status === 'pending' ? 'Pendentes' : 
                                 status === 'paid' ? 'Pagas' : 'Canceladas'}
                              </span>
                              {getStatusBadge(status)}
                            </div>
                            <span className="text-xl font-bold mt-2">{formatCurrency(totalTeamAmount)}</span>
                            <div className="flex justify-between text-xs text-muted-foreground mt-2">
                              <span>Total: {formatCurrency(totalAmount)}</span>
                              <span>{filteredByStatus.length} comissões</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  
                  {/* Resumo por Equipe */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Por Equipe</h3>
                    <div className="space-y-4">
                      {teams.length === 0 ? (
                        <div className="text-center p-4 border rounded-lg">
                          <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                          <p className="text-muted-foreground">
                            Nenhuma equipe encontrada
                          </p>
                        </div>
                      ) : (
                        teams.map(team => {
                          const teamCommissions = commissions.filter(c => c.team_id === team.id)
                          const totalTeamPending = teamCommissions
                            .filter(c => c.status === 'pending')
                            .reduce((acc, c) => acc + c.team_amount, 0)
                          const totalTeamPaid = teamCommissions
                            .filter(c => c.status === 'paid')
                            .reduce((acc, c) => acc + c.team_amount, 0)
                            
                          return (
                            <div key={team.id} className="flex justify-between items-center p-4 border rounded-lg">
                              <div>
                                <h4 className="font-medium">{team.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {teamCommissions.length} comissões no período
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm flex gap-4">
                                  <span>Pendente: <span className="font-medium">{formatCurrency(totalTeamPending)}</span></span>
                                  <span>Pago: <span className="font-medium">{formatCurrency(totalTeamPaid)}</span></span>
                                </div>
                                <div className="mt-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    disabled={totalTeamPending <= 0}
                                    onClick={() => handlePayTeam(team.id, team.name)}
                                  >
                                    <CreditCard className="mr-2 h-3 w-3" />
                                    Pagar
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 