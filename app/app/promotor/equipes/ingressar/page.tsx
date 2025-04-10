"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, ArrowLeft, UserPlus, Info } from 'lucide-react'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { toast } from 'sonner'

export default function IngressarEquipePage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(false)
  const [teamCode, setTeamCode] = useState('')
  const [error, setError] = useState('')
  const [sugestao, setSugestao] = useState('')
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!teamCode.trim()) {
      setError('Por favor, insira o código da equipe.')
      return
    }
    
    setError('')
    setSugestao('')
    setLoading(true)
    
    try {
      console.log(`Tentando ingressar na equipe com código: ${teamCode.trim()}`);
      console.log(`ID do usuário atual: ${user?.id}`);
      
      if (!user?.id) {
        setError('Você precisa estar logado para ingressar em uma equipe.')
        return
      }
      
      // Usar a função RPC join_team_with_code que contorna problemas de RLS
      const { data, error: rpcError } = await supabase.rpc(
        'join_team_with_code',
        {
          user_id_param: user.id,
          team_code_param: teamCode.trim()
        }
      )
      
      console.log("Resposta da função join_team_with_code:", data, rpcError);
      
      if (rpcError) {
        console.error('Erro ao ingressar na equipe:', rpcError);
        
        // Tratamento de erros específicos
        if (rpcError.message?.includes('já pertence')) {
          setError('Você já faz parte desta equipe.');
        } else if (rpcError.message?.includes('inválido')) {
          setError('Código de equipe inválido. Verifique e tente novamente.');
          setSugestao('Certifique-se de que o código está no formato TEAM-XXXXX e foi fornecido pelo líder da equipe.');
        } else {
          setError(`Não foi possível ingressar na equipe: ${rpcError.message || 'Erro desconhecido'}`);
          setSugestao('Se o problema persistir, entre em contato com o administrador da plataforma.');
        }
        return;
      }
      
      if (!data || data.success === false) {
        console.error('Erro retornado pela função:', data);
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.');
        return;
      }
      
      // Atualizar a sessão para refletir as mudanças
      console.log("Atualizando sessão após ingresso bem-sucedido.");
      
      // Mostrar mensagem de sucesso
      const teamName = data.team_name || 'selecionada';
      toast.success(`Você ingressou com sucesso na equipe ${teamName}!`);
      
      // Pequeno atraso para permitir que o toast seja visto
      setTimeout(() => {
        router.push('/app/promotor/equipes');
      }, 1500);
      
    } catch (error: any) {
      console.error('Erro geral ao ingressar na equipe:', error);
      setError(`Ocorreu um erro ao processar seu pedido: ${error.message || 'Tente novamente mais tarde'}`);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="container max-w-md py-8">
      <Link href="/app/promotor/equipes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para minhas equipes
      </Link>
      
      <Card>
        <CardHeader className="text-center">
          <UserPlus className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Ingressar em uma Equipe</CardTitle>
          <CardDescription>
            Insira o código da equipe fornecido pelo líder
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-code">
                  Código da Equipe
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
                  Digite o código exatamente como foi fornecido pelo líder da equipe
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
              {loading ? 'Verificando...' : 'Ingressar na Equipe'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Ao ingressar em uma equipe, você concorda em participar como promotor e receber comissões conforme as regras definidas.</p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 