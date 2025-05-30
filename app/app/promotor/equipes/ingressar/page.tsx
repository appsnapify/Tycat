"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'
import { joinTeamWithCode } from '../../../actions/team-actions'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, UserPlus, Info, Loader2 } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { toast } from 'sonner'

export default function IngressarEquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState('')
  const [sugestao, setSugestao] = useState('')
  const [redirecting, setRedirecting] = useState(false)
  
  useEffect(() => {
    if (redirecting) {
      const timer = setTimeout(() => {
        router.push('/app/promotor/dashboard')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [redirecting, router])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 1. Validação inicial
      if (!teamCode.trim()) {
        setError('Por favor, insira o código da equipa.')
        return
      }
      
      if (!user?.id) {
        setError('Você precisa estar logado para aderir a uma equipa.')
        return
      }
      
      // 2. Preparação
      setError('')
      setSugestao('')
      setLoading(true)

      // 3. Chamar Server Action
      const result = await joinTeamWithCode(teamCode.trim())
      
      // 4. Validar e tratar resultado
      if (!result) {
        throw new Error('Não foi possível processar a solicitação')
      }

      if (!result.success) {
        const errorMessage = result.error || 'Erro desconhecido'
        
        // Tratamento específico de mensagens de erro
        if (errorMessage.includes('não encontrada') || errorMessage.includes('inválido')) {
          setError('Código da equipa inválido ou equipa não encontrada.')
          setSugestao('Verifique se o código está correto e tente novamente.')
        } else if (errorMessage.includes('já é membro')) {
          setError('Você já faz parte desta equipa.')
          setSugestao('Escolha outra equipa ou acesse seu dashboard.')
        } else {
          setError(errorMessage)
          setSugestao('Se o problema persistir, entre em contato com o suporte.')
        }
        
        toast.error('Falha ao aderir à equipa')
        return
      }
      
      // 5. Processar sucesso - O papel será atualizado automaticamente pelo AuthProvider
      const teamName = result.data?.team_name || 'selecionada'
      toast.success(`Você aderiu com sucesso à equipa ${teamName}!`)
          
      // 6. Redirecionar
      setRedirecting(true)

    } catch (error) {
      console.error('Erro ao processar adesão:', error)
      
      setError('Ocorreu um erro inesperado ao processar sua solicitação.')
      setSugestao('Por favor, tente novamente. Se o problema persistir, contate o suporte.')
      toast.error('Falha ao aderir à equipa')

    } finally {
      setLoading(false)
    }
  }
  
  // Se estiver redirecionando, mostrar loader
  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Redirecionando para o dashboard...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Link href="/app/promotor/equipes/escolha" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para escolha
      </Link>
      
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Aderir a uma Equipa</CardTitle>
          <CardDescription>
            Insira o código da equipa fornecido pelo líder
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-code">
                  Código da Equipa
                </Label>
                <Input
                  id="team-code"
                  placeholder="Ex: TEAM-XXXXX"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  className="text-center uppercase"
                  maxLength={10}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Digite o código exatamente como foi fornecido pelo líder da equipa
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
              
              {sugestao && (
                <Alert variant="default" className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertTitle>Sugestão</AlertTitle>
                  <AlertDescription>
                    {sugestao}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4 border-t p-6">
            <Button 
              className="w-full"
              type="submit"
              disabled={loading || !teamCode.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Aderir à Equipa'
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Ao aderir a uma equipa, você concorda em participar como promotor e receber comissões conforme as regras definidas.</p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 