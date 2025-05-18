"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowUp,
  ArrowDown,
  Check,
  CreditCard,
  Euro,
  Filter,
  SearchIcon,
  Calendar,
  FileDown
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Commission {
  id: string
  eventId: string
  eventName: string 
  organizationId: string
  organizationName: string
  teamId: string
  teamName: string
  promoterId: string
  amount: number
  promoterAmount: number
  teamAmount: number
  status: 'pending' | 'processing' | 'paid' | 'rejected'
  ticketId: string
  createdAt: string
  paymentDate?: string
  receiptCode?: string
}

export default function PromotorComissoesPage() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [filteredCommissions, setFilteredCommissions] = useState<Commission[]>([])
  const [filter, setFilter] = useState({
    status: 'all',
    team: 'all',
    search: '',
    startDate: '',
    endDate: ''
  })
  const [teams, setTeams] = useState<{id: string, name: string}[]>([])
  const [totals, setTotals] = useState({
    all: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    rejected: 0
  })
  
  useEffect(() => {
    if (user) {
      loadCommissions()
      loadTeams()
    }
  }, [user])
  
  useEffect(() => {
    if (commissions.length > 0) {
      applyFilters()
    }
  }, [filter, commissions])
  
  const loadCommissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('commissions')
        .select(`
          id,
          amount,
          promoter_amount,
          team_amount,
          status,
          created_at,
          ticket_id,
          event_id,
          events:event_id (name),
          team_id,
          teams:team_id (name),
          organization_id,
          organizations:organization_id (name),
          payments:commission_payment_items (
            payment:payment_id (
              payment_date,
              receipt_code
            )
          )
        `)
        .eq('promoter_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (data) {
        const formattedCommissions: Commission[] = data.map(item => ({
          id: item.id,
          eventId: item.event_id,
          eventName: item.events?.name || 'Evento',
          organizationId: item.organization_id,
          organizationName: item.organizations?.name || 'Organização',
          teamId: item.team_id,
          teamName: item.teams?.name || 'Equipe',
          promoterId: user?.id || '',
          amount: item.amount || 0,
          promoterAmount: item.promoter_amount || 0,
          teamAmount: item.team_amount || 0,
          status: item.status || 'pending',
          ticketId: item.ticket_id,
          createdAt: item.created_at,
          paymentDate: item.payments?.[0]?.payment?.payment_date,
          receiptCode: item.payments?.[0]?.payment?.receipt_code
        }))
        
        setCommissions(formattedCommissions)
        
        // Calcular totais
        const newTotals = {
          all: 0,
          pending: 0,
          processing: 0,
          paid: 0,
          rejected: 0
        }
        
        formattedCommissions.forEach(commission => {
          newTotals.all += commission.promoterAmount
          
          if (commission.status === 'pending') {
            newTotals.pending += commission.promoterAmount
          } else if (commission.status === 'processing') {
            newTotals.processing += commission.promoterAmount
          } else if (commission.status === 'paid') {
            newTotals.paid += commission.promoterAmount
          } else if (commission.status === 'rejected') {
            newTotals.rejected += commission.promoterAmount
          }
        })
        
        setTotals(newTotals)
        setFilteredCommissions(formattedCommissions)
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      toast.error('Erro ao carregar as comissões')
    } finally {
      setLoading(false)
    }
  }
  
  const loadTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          teams:team_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
      
      if (error) throw error
      
      if (data) {
        const uniqueTeams = data.reduce((acc: {id: string, name: string}[], item) => {
          if (item.teams && !acc.some(t => t.id === item.teams.id)) {
            acc.push({
              id: item.teams.id,
              name: item.teams.name
            })
          }
          return acc
        }, [])
        
        setTeams(uniqueTeams)
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
    }
  }
  
  const applyFilters = () => {
    let filtered = [...commissions]
    
    // Filtro por status
    if (filter.status !== 'all') {
      filtered = filtered.filter(commission => commission.status === filter.status)
    }
    
    // Filtro por equipe
    if (filter.team !== 'all') {
      filtered = filtered.filter(commission => commission.teamId === filter.team)
    }
    
    // Filtro por texto
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      filtered = filtered.filter(commission => 
        commission.eventName.toLowerCase().includes(searchLower) ||
        commission.organizationName.toLowerCase().includes(searchLower) ||
        commission.receiptCode?.toLowerCase().includes(searchLower)
      )
    }
    
    // Filtro por data inicial
    if (filter.startDate) {
      const startDate = new Date(filter.startDate)
      filtered = filtered.filter(commission => {
        const commissionDate = new Date(commission.createdAt)
        return commissionDate >= startDate
      })
    }
    
    // Filtro por data final
    if (filter.endDate) {
      const endDate = new Date(filter.endDate)
      endDate.setHours(23, 59, 59, 999) // Fim do dia
      filtered = filtered.filter(commission => {
        const commissionDate = new Date(commission.createdAt)
        return commissionDate <= endDate
      })
    }
    
    setFilteredCommissions(filtered)
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>
      case 'processing':
        return <Badge variant="secondary">Em processamento</Badge>
      case 'paid':
        return <Badge variant="success">Pago</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }
  
  const clearFilters = () => {
    setFilter({
      status: 'all',
      team: 'all',
      search: '',
      startDate: '',
      endDate: ''
    })
  }
  
  const exportCsv = () => {
    // Criar dados CSV
    const headers = ['Data', 'Evento', 'Organização', 'Equipe', 'Valor', 'Status', 'Código de Recibo']
    
    const csvData = filteredCommissions.map(commission => [
      new Date(commission.createdAt).toLocaleDateString('pt-PT'),
      commission.eventName,
      commission.organizationName,
      commission.teamName,
      commission.promoterAmount.toFixed(2).replace('.', ','),
      commission.status === 'pending' ? 'Pendente' : 
        commission.status === 'processing' ? 'Em processamento' : 
        commission.status === 'paid' ? 'Pago' : 'Rejeitado',
      commission.receiptCode || ''
    ])
    
    // Adicionar cabeçalho
    csvData.unshift(headers)
    
    // Converter para string CSV
    const csvContent = csvData.map(row => row.join(';')).join('\n')
    
    // Criar blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `comissoes_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('Relatório exportado com sucesso')
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
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Comissões</h1>
        <div className="grid grid-cols-1 gap-6">
          {[1, 2, 3].map((item) => (
            <Card key={item} className="animate-pulse">
              <CardHeader className="bg-muted/40 h-12"></CardHeader>
              <CardContent className="p-6">
                <div className="h-48 bg-muted/40 rounded-md"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold">Comissões</h1>
        
        <div className="flex items-center mt-4 sm:mt-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => loadCommissions()}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.pending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.processing)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos sendo processados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.paid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos já realizados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.all)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as comissões geradas
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Filtros */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select 
                value={filter.status} 
                onValueChange={(value) => setFilter({...filter, status: value})}
              >
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Em processamento</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-team">Equipe</Label>
              <Select 
                value={filter.team} 
                onValueChange={(value) => setFilter({...filter, team: value})}
              >
                <SelectTrigger id="filter-team">
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-start-date">Data Inicial</Label>
              <div className="relative">
                <Input
                  id="filter-start-date"
                  type="date"
                  value={filter.startDate}
                  onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-end-date">Data Final</Label>
              <div className="relative">
                <Input
                  id="filter-end-date"
                  type="date"
                  value={filter.endDate}
                  onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                />
                <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="filter-search">Buscar</Label>
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-search"
                  type="text"
                  placeholder="Evento, organização..."
                  className="pl-9"
                  value={filter.search}
                  onChange={(e) => setFilter({...filter, search: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabela de comissões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comissões</CardTitle>
          <CardDescription>
            {filteredCommissions.length} {filteredCommissions.length === 1 ? 'comissão encontrada' : 'comissões encontradas'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma comissão encontrada</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {commissions.length > 0 
                  ? 'Ajuste os filtros para ver suas comissões.' 
                  : 'Você ainda não tem comissões geradas. Quando suas vendas gerarem comissões, elas aparecerão aqui.'}
              </p>
              {commissions.length > 0 && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Equipe</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recibo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCommissions.map(commission => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">{formatDate(commission.createdAt)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={commission.eventName}>
                          {commission.eventName}
                        </div>
                        <div className="text-xs text-muted-foreground">{commission.organizationName}</div>
                      </TableCell>
                      <TableCell>{commission.teamName}</TableCell>
                      <TableCell>{formatCurrency(commission.promoterAmount)}</TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell>
                        {commission.receiptCode ? (
                          <div className="font-mono text-xs">{commission.receiptCode}</div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 