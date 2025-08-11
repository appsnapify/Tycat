"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { AlertCircle, ArrowLeft, Building, CreditCard, Percent, PlusCircle, Search } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

interface Organization {
  id: string
  name: string
}

// Interface para dados retornados pelo Supabase (estrutura real)
interface SupabaseOrgData {
  organizations: {
    id: string;
    name: string;
  } | null;
}



export default function AdicionarEquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState('')
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [commissionType, setCommissionType] = useState<string>('percentage')
  const [commissionRate, setCommissionRate] = useState<number>(10)
  const [fixedAmount, setFixedAmount] = useState<number>(5)
  const [teamSplit, setTeamSplit] = useState<number>(30)
  
  useEffect(() => {
    fetchOrganizations()
  }, [user])
  
  const fetchOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('user_organizations')
        .select(`
          organizations:organization_id (
            id,
            name
          )
        `)
        .eq('user_id', user?.id)
        .eq('role', 'owner')
        
      if (error) throw error
      
            if (data && data.length > 0) {
        // Processamento seguro sem type assertion problemática
        const orgs: Organization[] = []
        
        for (const item of data) {
          if (item.organizations && 
              typeof item.organizations === 'object' && 
              'id' in item.organizations && 
              'name' in item.organizations &&
              typeof item.organizations.id === 'string' &&
              typeof item.organizations.name === 'string') {
            orgs.push({
              id: item.organizations.id,
              name: item.organizations.name
            })
          }
        }
        
        setOrganizations(orgs)
        
        // Se houver apenas uma organização, seleciona-a automaticamente
        if (orgs.length === 1) {
          setSelectedOrg(orgs[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar organizações:', error)
    }
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!teamCode.trim()) {
      setError('Por favor, insira o código da equipe.')
      return
    }
    
    if (!selectedOrg) {
      setError('Por favor, selecione uma organização.')
      return
    }
    
    setError('')
    setLoading(true)
    
    try {
      // 1. Verificar se o código da equipe existe
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('team_code', teamCode.trim())
        .single()
        
      if (teamError) {
        if (teamError.code === 'PGRST116') {
          setError('Código de equipe inválido. Verifique e tente novamente.')
        } else {
          throw teamError
        }
        return
      }
      
      // 2. Verificar se a equipe já está vinculada à organização
      const { data: existingLink, error: linkCheckError } = await supabase
        .from('organization_teams')
        .select('id')
        .eq('organization_id', selectedOrg)
        .eq('team_id', teamData.id)
        .maybeSingle()
        
      if (linkCheckError) throw linkCheckError
      
      if (existingLink) {
        setError('Esta equipe já está vinculada à sua organização.')
        return
      }
      
      // 3. Preparar as configurações de comissão com base no tipo selecionado
      let commissionSettings = {}
      
      if (commissionType === 'percentage') {
        commissionSettings = {
          team_split: teamSplit,
          promoter_split: 100 - teamSplit,
          rate: commissionRate
        }
      } else if (commissionType === 'fixed') {
        commissionSettings = {
          team_split: teamSplit,
          promoter_split: 100 - teamSplit,
          fixed_amount: fixedAmount
        }
      } else if (commissionType === 'tiered') {
        // Implementação básica de patamares - pode ser expandida no futuro
        commissionSettings = {
          team_split: teamSplit,
          promoter_split: 100 - teamSplit,
          rate: commissionRate,
          tiers: [
            { threshold: 0, rate: commissionRate * 0.8 },
            { threshold: 5, rate: commissionRate },
            { threshold: 20, rate: commissionRate * 1.2 }
          ]
        }
      }
      
      // 4. Vincular a equipe à organização
      const { error: linkError } = await supabase
        .from('organization_teams')
        .insert({
          organization_id: selectedOrg,
          team_id: teamData.id,
          commission_type: commissionType,
          commission_settings: commissionSettings,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        
      if (linkError) throw linkError
      
      toast.success(`Equipe ${teamData.name} adicionada com sucesso!`)
      router.push('/app/organizador/equipes')
      
    } catch (error) {
      console.error('Erro ao adicionar equipe:', error)
      setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="container max-w-md py-8">
      <Link href="/app/organizador/equipes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para equipes
      </Link>
      
      <Card>
        <CardHeader className="text-center">
          <Building className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Criar Equipe</CardTitle>
          <CardDescription>
            Vincule uma equipe à sua organização
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-6">
              {/* Código da Equipe */}
              <div className="space-y-2">
                <Label htmlFor="team-code">
                  Código da Equipe
                </Label>
                <Input
                  id="team-code"
                  placeholder="Ex: TEAM-AB123"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="text-center uppercase"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Insira o código fornecido pelo líder da equipe
                </p>
              </div>
              
              {/* Seleção de Organização */}
              {organizations.length > 1 && (
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <RadioGroup 
                    value={selectedOrg} 
                    onValueChange={setSelectedOrg}
                    className="space-y-2"
                  >
                    {organizations.map(org => (
                      <div key={org.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={org.id} id={`org-${org.id}`} />
                        <Label htmlFor={`org-${org.id}`}>{org.name}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}
              
              {/* Tipo de Comissão */}
              <div className="space-y-2">
                <Label>Tipo de Comissão</Label>
                <RadioGroup 
                  value={commissionType} 
                  onValueChange={setCommissionType}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percentage" id="type-percentage" />
                    <Label htmlFor="type-percentage" className="flex items-center">
                      <Percent className="mr-2 h-4 w-4" />
                      Percentual sobre venda
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fixed" id="type-fixed" />
                    <Label htmlFor="type-fixed" className="flex items-center">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Valor fixo por venda
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Configurações de Comissão - Percentual */}
              {commissionType === 'percentage' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Taxa de Comissão</Label>
                      <span className="text-sm font-medium">{commissionRate}%</span>
                    </div>
                    <Slider
                      value={[commissionRate]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={(value) => setCommissionRate(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentual sobre o valor da venda
                    </p>
                  </div>
                </div>
              )}
              
              {/* Configurações de Comissão - Fixo */}
              {commissionType === 'fixed' && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Valor Fixo</Label>
                      <span className="text-sm font-medium">{fixedAmount} €</span>
                    </div>
                    <Slider
                      value={[fixedAmount]}
                      min={1}
                      max={50}
                      step={1}
                      onValueChange={(value) => setFixedAmount(value[0])}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor fixo por cada venda realizada
                    </p>
                  </div>
                </div>
              )}
              
              {/* Divisão Equipe/Promotor */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <Label>Divisão de Comissão</Label>
                  <span className="text-sm font-medium">
                    Equipe: {teamSplit}% | Promotor: {100-teamSplit}%
                  </span>
                </div>
                <Slider
                  value={[teamSplit]}
                  min={10}
                  max={90}
                  step={5}
                  onValueChange={(value) => setTeamSplit(value[0])}
                />
                <p className="text-xs text-muted-foreground">
                  Como a comissão será dividida entre a equipe e o promotor
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4 border-t p-6">
            <Button 
              className="w-full"
              type="submit"
              disabled={loading || !teamCode.trim() || !selectedOrg}
            >
              {loading ? 'Adicionando...' : 'Adicionar Equipe'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 