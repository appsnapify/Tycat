"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { toast } from 'sonner'

export default function CriarEquipePage() {
  const router = useRouter()
  const { user, updateUserRole } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
  const [error, setError] = useState('')
  
  const generateTeamCode = () => {
    // Gerar um código de equipa no formato TEAM-XXXXX
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TEAM-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!teamName.trim()) {
      setError('Por favor, insira o nome da equipa.')
      return
    }
    
    if (!user) {
      setError('Utilizador não autenticado. Por favor, faça login novamente.')
      return
    }
    
    setError('')
    setLoading(true)
    
    try {
      console.log("Tentando criar equipa para o utilizador:", user.id);
      
      // Criar a equipe usando RPC
      const { data: teamId, error: rpcError } = await supabase
        .rpc('create_promoter_team_v2', {
          user_id: user.id,
          team_name: teamName.trim(),
          team_description: teamDescription.trim() || null
        })
        
      if (rpcError) {
        throw new Error(`Erro ao criar equipe: ${rpcError.message}`)
      }
      
      if (!teamId) {
        throw new Error('ID da equipe não foi retornado após a criação')
      }
      
      console.log("Equipe criada com sucesso:", teamId);
      
      // Atualizar metadados do usuário no Supabase
      try {
        console.log("Atualizando metadados do usuário para chefe de equipe no Supabase");
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            role: 'team-leader', // Alterando papel base para team-leader
            previous_role: user?.user_metadata?.role || 'chefe-equipe',
            team_id: teamId, // Armazenamos o ID da equipe para referência rápida
            team_role: 'leader' // Armazenamos o papel específico na equipe
          }
        });
        
        if (metadataError) {
          console.error("Erro ao atualizar metadados do usuário:", metadataError);
        } else {
          console.log("Metadados do usuário atualizados com sucesso no Supabase");
        }
      } catch (metadataUpdateError) {
        console.error("Exceção ao atualizar metadados do usuário:", metadataUpdateError);
      }
      
      // Usar setTimeout para todas as operações que podem causar updates durante renderização
      setTimeout(() => {
        // Atualizar o papel do usuário usando o contexto de autenticação
        updateUserRole('team-leader');
        
        // Mostrar mensagem de sucesso em outro setTimeout aninhado
        setTimeout(() => {
          toast.success('Equipa criada com sucesso! Você agora é um Chefe de Equipe.');
          
          // Redirecionar para o dashboard após mostrar o toast
          setTimeout(() => {
            router.push('/app/chefe-equipe/dashboard');
          }, 100);
        }, 100);
      }, 100);
      
    } catch (error) {
      console.error('Erro ao criar equipa:', error);
      const errorMsg = error instanceof Error 
        ? `Erro: ${error.message}` 
        : 'Ocorreu um erro desconhecido ao criar a equipa. Tente novamente.';
      
      // Usar setTimeout para atualizar o estado de erro para evitar update durante renderização
      setTimeout(() => {
        setError(errorMsg);
        setLoading(false);
      }, 0);
      return;
    }
    
    // Definir loading como false no final
    setLoading(false);
  }
  
  return (
    <div className="container max-w-2xl py-8">
      <Link href="/app/chefe-equipe/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para o painel
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Equipa</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar a sua própria equipa de promotores.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="team-name" className="required">
                Nome da Equipa
              </Label>
              <Input
                id="team-name"
                placeholder="Introduza o nome da sua equipa"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Este nome será visível para organizadores e promotores.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="team-description">
                Descrição
              </Label>
              <Textarea
                id="team-description"
                placeholder="Descrição sobre a sua equipa (opcional)"
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Uma breve descrição ajuda a explicar o propósito da sua equipa.
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
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4 border-t p-6">
            <Button 
              className="w-full"
              type="submit"
              disabled={loading || !teamName.trim()}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A criar...
                </>
              ) : (
                'Criar Equipa'
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <p>Ao criar uma equipa, você se tornará o líder oficial de equipe.</p>
              <Button 
                variant="link" 
                type="button"
                className="p-0 h-auto text-sm font-normal"
                onClick={() => router.push('/app/chefe-equipe/dashboard')}
              >
                Voltar para o dashboard
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
} 