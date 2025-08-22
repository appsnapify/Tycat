"use client"

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  Euro,
  Mail,
  Printer,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import Link from 'next/link'

interface CommissionItem {
  id: string
  eventId: string
  eventName: string
  teamId: string
  teamName: string
  promoterId: string
  promoterName: string
  amount: number
  promoterAmount: number
  teamAmount: number
  status: string
  createdAt: string
  selected: boolean
}

interface Team {
  id: string
  name: string
  pendingAmount: number
  commissionCount: number
}

export default function OrganizadorPagarComissoesPage() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [commissions, setCommissions] = useState<CommissionItem[]>([])
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([])
  const [totalSelected, setTotalSelected] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [generateReceipt, setGenerateReceipt] = useState(true)
  const [notes, setNotes] = useState('')
  const [organization, setOrganization] = useState<{ id: string, name: string } | null>(null)
  
  useEffect(() => {
    if (user) {
      loadOrganization()
      loadTeams()
    }
  }, [user])
  
  useEffect(() => {
    if (selectedTeam) {
      loadCommissions(selectedTeam)
    } else {
      setCommissions([])
    }
  }, [selectedTeam, startDate, endDate])
  
  useEffect(() => {
    calculateSelectedTotal()
  }, [selectedCommissions, commissions])
  
  const loadOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organizations:organization_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single()
      
      if (error) throw error
      
      if (data && data.organizations) {
        setOrganization({
          id: data.organizations.id,
          name: data.organizations.name
        })
      }
    } catch (error) {
      console.error('Erro ao carregar organização:', error)
    }
  }
  
  const loadTeams = async () => {
    setLoading(true)
    try {
      // Carregar equipes vinculadas à organização do usuário
      const { data: orgMember, error: orgError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single()
      
      if (orgError) throw orgError
      
      if (orgMember) {
        const { data: orgTeams, error: teamsError } = await supabase
          .from('organization_teams')
          .select(`
            team_id,
            teams:team_id (
              id,
              name
            ),
            (
              SELECT 
                COUNT(*) as commission_count,
                COALESCE(SUM(amount), 0) as pending_amount
              FROM commissions 
              WHERE 
                organization_id = organization_teams.organization_id 
                AND team_id = organization_teams.team_id
                AND status = 'pending'
            )
          `)
          .eq('organization_id', orgMember.organization_id)
          .eq('is_active', true)
        
        if (teamsError) throw teamsError
        
        if (orgTeams) {
          const formattedTeams: Team[] = orgTeams
            .filter(team => team.teams) // Filtrar equipes nulas
            .map(team => ({
              id: team.teams.id,
              name: team.teams.name,
              pendingAmount: team[0]?.pending_amount || 0,
              commissionCount: team[0]?.commission_count || 0
            }))
            .sort((a, b) => b.pendingAmount - a.pendingAmount) // Ordenar por valor pendente decrescente
          
          setTeams(formattedTeams)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar equipes:', error)
      toast.error('Erro ao carregar as equipes')
    } finally {
      setLoading(false)
    }
  }
  
  const loadCommissions = async (teamId: string) => {
    setLoading(true)
    try {
      let query = supabase
        .from('commissions')
        .select(`
          id,
          amount,
          promoter_amount,
          team_amount,
          status,
          created_at,
          event_id,
          events:event_id (name),
          team_id,
          teams:team_id (name),
          promoter_id,
          profiles:promoter_id (full_name, email)
        `)
        .eq('team_id', teamId)
        .eq('status', 'pending')
      
      // Filtrar por data, se fornecida
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }
      
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }
      
      // Ordenar por data
      query = query.order('created_at', { ascending: false })
      
      const { data, error } = await query
      
      if (error) throw error
      
      if (data) {
        const formattedCommissions: CommissionItem[] = data.map(item => ({
          id: item.id,
          eventId: item.event_id,
          eventName: item.events?.name || 'Evento',
          teamId: item.team_id,
          teamName: item.teams?.name || 'Equipe',
          promoterId: item.promoter_id,
          promoterName: item.profiles?.full_name || 'Promotor',
          amount: item.amount || 0,
          promoterAmount: item.promoter_amount || 0,
          teamAmount: item.team_amount || 0,
          status: item.status || 'pending',
          createdAt: item.created_at,
          selected: false
        }))
        
        setCommissions(formattedCommissions)
        setSelectedCommissions([])
      }
    } catch (error) {
      console.error('Erro ao carregar comissões:', error)
      toast.error('Erro ao carregar as comissões')
    } finally {
      setLoading(false)
    }
  }
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = commissions.map(comm => comm.id)
      setSelectedCommissions(allIds)
    } else {
      setSelectedCommissions([])
    }
  }
  
  const handleSelectCommission = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissions(prev => [...prev, id])
    } else {
      setSelectedCommissions(prev => prev.filter(commId => commId !== id))
    }
  }
  
  const calculateSelectedTotal = () => {
    const total = commissions
      .filter(comm => selectedCommissions.includes(comm.id))
      .reduce((sum, comm) => sum + comm.amount, 0)
    
    setTotalSelected(total)
  }
  
  const handleSubmitPayment = async () => {
    if (selectedCommissions.length === 0) {
      toast.error('Selecione pelo menos uma comissão para pagar')
      return
    }
    
    if (!organization) {
      toast.error('Organização não encontrada')
      return
    }
    
    setProcessingPayment(true)
    
    try {
      // 1. Gerar código de recibo único
      const receiptCode = generateReceiptCode()
      
      // 2. Criar registro de pagamento
      const { data: paymentData, error: paymentError } = await supabase
        .from('commission_payments')
        .insert({
          organization_id: organization.id,
          team_id: selectedTeam,
          payment_date: new Date().toISOString(),
          amount: totalSelected,
          receipt_code: receiptCode,
          payment_method: 'cash',
          status: 'completed',
          notes: notes,
          created_by: user?.id
        })
        .select('id')
        .single()
      
      if (paymentError) throw paymentError
      
      if (paymentData) {
        // ✅ FUNÇÃO AUXILIAR: Encontrar comissão por ID
        const findCommissionAmount = (commissionId: string): number => {
          const commission = commissions.find(c => c.id === commissionId)
          return commission?.amount || 0
        }
        
        // 3. Criar itens de pagamento para cada comissão
        const paymentItems = selectedCommissions.map(commissionId => ({
          payment_id: paymentData.id,
          commission_id: commissionId,
          amount: findCommissionAmount(commissionId),
          created_at: new Date().toISOString()
        }))
        
        const { error: itemsError } = await supabase
          .from('commission_payment_items')
          .insert(paymentItems)
        
        if (itemsError) throw itemsError
        
        // 4. Atualizar status das comissões para "paid"
        const { error: updateError } = await supabase
          .from('commissions')
          .update({ status: 'paid' })
          .in('id', selectedCommissions)
        
        if (updateError) throw updateError
        
        // 5. Enviar e-mail (simulado - seria implementado no backend)
        if (sendEmail) {
          // Esta é apenas uma simulação - o e-mail seria enviado pelo backend
          console.log(`Email seria enviado para a equipe ${selectedTeam} com o recibo ${receiptCode}`)
        }
        
        toast.success('Pagamento processado com sucesso!')
        
        // 6. Redirecionar para a página de recibo se solicitado
        if (generateReceipt) {
          router.push(`/app/organizador/comissoes/recibo/${paymentData.id}`)
        } else {
          router.push('/app/organizador/comissoes')
        }
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error)
      toast.error('Erro ao processar o pagamento')
    } finally {
      setProcessingPayment(false)
    }
  }
  
  const generateReceiptCode = () => {
    // Gerar um código de recibo único no formato PAY-XXXX-YYYY
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
    const datePart = new Date().getTime().toString(36).substring(0, 4).toUpperCase()
    return `PAY-${randomPart}-${datePart}`
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
  
  if (loading && teams.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">Pagar Comissões</h1>
        <Card className="animate-pulse">
          <CardHeader className="bg-muted/40 h-12"></CardHeader>
          <CardContent className="p-6">
            <div className="h-[400px] bg-muted/40 rounded-md"></div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/app/organizador/comissoes">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Pagar Comissões</h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        {/* Painel lateral - Detalhes do pagamento */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Pagamento</CardTitle>
              <CardDescription>
                Selecione a equipe e o período
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="select-team">Equipe</Label>
                <Select 
                  value={selectedTeam || ''} 
                  onValueChange={setSelectedTeam}
                >
                  <SelectTrigger id="select-team">
                    <SelectValue placeholder="Selecione uma equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.commissionCount > 0 ? `${formatCurrency(team.pendingAmount)}` : 'Sem pendências'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data Inicial</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="end-date">Data Final</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              
              {selectedTeam && commissions.length > 0 && (
                <div className="space-y-4 mt-6 pt-6 border-t">
                  <h3 className="font-medium">Resumo</h3>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Comissões selecionadas:</span>
                    <span className="font-medium">{selectedCommissions.length} de {commissions.length}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total a pagar:</span>
                    <span className="font-medium">{formatCurrency(totalSelected)}</span>
                  </div>
                  
                  <div className="pt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="send-email" 
                        checked={sendEmail}
                        onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                      />
                      <Label htmlFor="send-email">Enviar notificação por email</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="generate-receipt" 
                        checked={generateReceipt}
                        onCheckedChange={(checked) => setGenerateReceipt(checked as boolean)}
                      />
                      <Label htmlFor="generate-receipt">Gerar recibo para impressão</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Notas adicionais para o pagamento..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    className="w-full" 
                    disabled={selectedCommissions.length === 0 || processingPayment}
                    onClick={handleSubmitPayment}
                  >
                    {processingPayment ? (
                      <>Processando...</>
                    ) : (
                      <>
                        <Euro className="mr-2 h-4 w-4" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Painel principal - Lista de comissões */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Comissões Pendentes</CardTitle>
              <CardDescription>
                {selectedTeam ? (
                  <>
                    {commissions.length} {commissions.length === 1 ? 'comissão pendente' : 'comissões pendentes'} para {teams.find(t => t.id === selectedTeam)?.name}
                  </>
                ) : (
                  'Selecione uma equipe para ver as comissões pendentes'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedTeam ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Selecione uma equipe</h3>
                  <p className="text-muted-foreground max-w-md">
                    Escolha uma equipe no painel ao lado para ver as comissões pendentes e efetuar o pagamento.
                  </p>
                </div>
              ) : commissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-medium mb-2">Nenhuma comissão pendente</h3>
                  <p className="text-muted-foreground max-w-md">
                    Esta equipe não possui comissões pendentes no período selecionado.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox 
                      id="select-all" 
                      checked={selectedCommissions.length === commissions.length}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all">Selecionar todas</Label>
                  </div>
                  
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Evento</TableHead>
                          <TableHead>Promotor</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {commissions.map(commission => (
                          <TableRow key={commission.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedCommissions.includes(commission.id)}
                                onCheckedChange={(checked) => 
                                  handleSelectCommission(commission.id, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell>{formatDate(commission.createdAt)}</TableCell>
                            <TableCell>
                              <div className="max-w-[150px] truncate" title={commission.eventName}>
                                {commission.eventName}
                              </div>
                            </TableCell>
                            <TableCell>{commission.promoterName}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(commission.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 