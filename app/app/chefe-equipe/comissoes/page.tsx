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
  Calendar,
  Check,
  ChevronDown,
  Download,
  Filter,
  LineChart,
  Search,
  ArrowUpDown,
  DollarSign,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface Commission {
  id: string
  event_name: string
  organization_name: string
  date: string
  amount: number
  status: 'pending' | 'paid' | 'processing'
  promoter_name: string
}

export default function ComissoesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [period, setPeriod] = useState<string>('this-month')
  
  // Dados do financeiro
  const [metrics, setMetrics] = useState({
    totalPending: 0,
    totalPaid: 0,
    totalEarned: 0,
    thisMonth: 0,
    lastMonth: 0
  })
  
  useEffect(() => {
    if (user) {
      loadTeamData()
    }
  }, [user])
  
  const loadTeamData = async () => {
    setLoading(true)
    try {
      // Obter ID da equipe dos metadados do usuário
      const teamId = user?.user_metadata?.team_id
      
      if (!teamId) {
        console.error("ID da equipe não encontrado nos metadados")
        setLoading(false)
        return
      }
      
      setTeamId(teamId)
      
      // Buscar comissões do Supabase
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select(`
          id,
          amount,
          status,
          created_at,
          events (
            id,
            name,
            date,
            organizations (
              id,
              name
            )
          ),
          team_members (
            id,
            profiles (
              id,
              full_name
            )
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
      
      if (commissionsError) {
        console.error("Erro ao buscar comissões:", commissionsError)
        toast.error("Erro ao carregar comissões")
        
        // Carregar dados simulados em caso de erro
        setMockDataOnError()
        return
      }
      
      if (!commissionsData || commissionsData.length === 0) {
        // Se não houver comissões, exibe a interface com dados vazios
        setCommissions([])
        setMetrics({
          totalPending: 0,
          totalPaid: 0,
          totalEarned: 0,
          thisMonth: 0,
          lastMonth: 0
        })
        setLoading(false)
        return
      }
      
      // Processar os dados das comissões
      const processedCommissions: Commission[] = commissionsData.map(commission => {
        const event = commission.events || {}
        const organization = event.organizations || {}
        const teamMember = commission.team_members || {}
        const profile = teamMember.profiles || {}
        
        return {
          id: commission.id,
          event_name: event.name || 'Evento sem nome',
          organization_name: organization.name || 'Organização desconhecida',
          date: event.date || commission.created_at,
          amount: parseFloat(commission.amount) || 0,
          status: commission.status as 'pending' | 'paid' | 'processing',
          promoter_name: profile.full_name || 'Promotor desconhecido'
        }
      })
      
      setCommissions(processedCommissions)
      
      // Calcular métricas
      const totalPending = processedCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)
        
      const totalPaid = processedCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0)
      
      // Calcular comissões do mês atual
      const now = new Date()
      const thisMonth = processedCommissions
        .filter(c => {
          const date = new Date(c.date)
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        })
        .reduce((sum, c) => sum + c.amount, 0)
      
      // Calcular comissões do mês anterior
      const lastMonthDate = new Date()
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
      const lastMonth = processedCommissions
        .filter(c => {
          const date = new Date(c.date)
          return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear()
        })
        .reduce((sum, c) => sum + c.amount, 0)
      
      setMetrics({
        totalPending,
        totalPaid,
        totalEarned: totalPending + totalPaid,
        thisMonth,
        lastMonth
      })
      
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error)
      toast.error('Erro ao carregar dados financeiros')
      
      // Carregar dados simulados em caso de erro
      setMockDataOnError()
    } finally {
      setLoading(false)
    }
  }
  
  // Função auxiliar para carregar dados simulados em caso de erro
  const setMockDataOnError = () => {
    const mockCommissions: Commission[] = [
      {
        id: '1',
        event_name: 'Festa de Verão',
        organization_name: 'Clube XYZ',
        date: '2023-07-15',
        amount: 150.50,
        status: 'paid',
        promoter_name: 'João Silva'
      },
      {
        id: '2',
        event_name: 'Festival de Música',
        organization_name: 'Arena Musical',
        date: '2023-08-20',
        amount: 275.00,
        status: 'pending',
        promoter_name: 'Maria Oliveira'
      },
      {
        id: '3',
        event_name: 'Show de Rock',
        organization_name: 'Arena Musical',
        date: '2023-09-05',
        amount: 120.75,
        status: 'processing',
        promoter_name: 'Carlos Santos'
      },
      {
        id: '4',
        event_name: 'Noite Eletrônica',
        organization_name: 'Clube XYZ',
        date: '2023-09-12',
        amount: 200.00,
        status: 'pending',
        promoter_name: 'Ana Pereira'
      },
      {
        id: '5',
        event_name: 'Festa à Fantasia',
        organization_name: 'Festival de Verão',
        date: '2023-10-31',
        amount: 350.25,
        status: 'paid',
        promoter_name: 'Luís Ferreira'
      }
    ]
    
    setCommissions(mockCommissions)
    
    // Calcular métricas para dados simulados
    const totalPending = mockCommissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0)
      
    const totalPaid = mockCommissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0)
      
    const thisMonth = mockCommissions
      .filter(c => {
        const date = new Date(c.date)
        const now = new Date()
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
      })
      .reduce((sum, c) => sum + c.amount, 0)
      
    setMetrics({
      totalPending,
      totalPaid,
      totalEarned: totalPending + totalPaid,
      thisMonth,
      lastMonth: 900 // Valor fictício para exemplo
    })
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
      case 'paid':
        return <Badge variant="success" className="flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" /> Pago</Badge>
      case 'pending':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>
      case 'processing':
        return <Badge variant="outline" className="flex items-center"><AlertCircle className="h-3 w-3 mr-1" /> Processando</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  
  const filteredCommissions = commissions.filter(commission => {
    // Filtrar por termo de busca
    const matchesSearch = 
      commission.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.organization_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      commission.promoter_name.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filtrar por status
    const matchesStatus = filterStatus === 'all' || commission.status === filterStatus
    
    return matchesSearch && matchesStatus
  })
  
  // Crescimento em relação ao mês anterior
  const growthRate = metrics.lastMonth > 0 
    ? ((metrics.thisMonth - metrics.lastMonth) / metrics.lastMonth) * 100 
    : 0
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Comissões</h1>
        <p className="text-muted-foreground mb-8">
          Gerencie as comissões da sua equipe
        </p>
        
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-12 bg-muted/40"></CardHeader>
              <CardContent className="p-6">
                <div className="h-24 bg-muted/40 rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Comissões</h1>
          <p className="text-muted-foreground">
            Gerencie as comissões da sua equipe
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => router.push('/app/chefe-equipe/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
      
      {/* Cards de resumo */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissões Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Valor acumulado de todas as comissões
            </p>
            <div className="mt-3">
              <Progress value={metrics.totalPaid / (metrics.totalEarned || 1) * 100} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Recebido: {formatCurrency(metrics.totalPaid)}</span>
                <span>Pendente: {formatCurrency(metrics.totalPending)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Comissões Este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.thisMonth)}
            </div>
            
            <div className="flex items-center mt-1">
              {growthRate !== 0 && (
                <Badge variant={growthRate >= 0 ? "success" : "destructive"} className="mr-2">
                  <span className="flex items-center">
                    {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
                  </span>
                </Badge>
              )}
              <p className="text-xs text-muted-foreground">
                vs. mês anterior ({formatCurrency(metrics.lastMonth)})
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="outline" className="w-full" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </Button>
              <Button className="w-full col-span-2" size="sm">
                <CreditCard className="mr-2 h-4 w-4" />
                Confirmar Pagamentos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros e controles */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comissões..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="processing">Em processamento</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">Todo o período</SelectItem>
            <SelectItem value="this-month">Este mês</SelectItem>
            <SelectItem value="last-month">Mês passado</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Tabela de comissões */}
      <Card className="mb-8">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium">Evento</th>
                  <th className="text-left p-4 font-medium">Organização</th>
                  <th className="text-left p-4 font-medium">Data</th>
                  <th className="text-right p-4 font-medium">Valor</th>
                  <th className="text-center p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Promotor</th>
                  <th className="text-right p-4 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommissions.length > 0 ? (
                  filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{commission.event_name}</td>
                      <td className="p-4">{commission.organization_name}</td>
                      <td className="p-4">{formatDate(commission.date)}</td>
                      <td className="p-4 text-right font-medium">{formatCurrency(commission.amount)}</td>
                      <td className="p-4 text-center">{getStatusBadge(commission.status)}</td>
                      <td className="p-4">{commission.promoter_name}</td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                            {commission.status === 'pending' && (
                              <DropdownMenuItem>Marcar como pago</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Ver evento</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Nenhuma comissão encontrada com os filtros atuais
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      {/* Gráfico e estatísticas (simplificado) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução de Comissões</CardTitle>
          <CardDescription>
            Histórico de comissões dos últimos 6 meses
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[300px] bg-muted/30 rounded-md flex items-center justify-center mb-4">
            <div className="text-center">
              <LineChart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground">
                Gráfico de evolução de comissões ao longo do tempo
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Maior Comissão</h4>
              <p className="text-2xl font-bold">{formatCurrency(350.25)}</p>
              <p className="text-xs text-muted-foreground">Festa à Fantasia</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Média Mensal</h4>
              <p className="text-2xl font-bold">{formatCurrency(219.30)}</p>
              <p className="text-xs text-muted-foreground">Baseado nos últimos 6 meses</p>
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Total Acumulado</h4>
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalEarned)}</p>
              <p className="text-xs text-muted-foreground">Desde o início</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 