"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/app/app/_providers/auth-provider'
import Link from 'next/link'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Heading } from "@/components/heading";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, ArrowLeft, Info, AlertCircle, Loader2 } from "lucide-react";
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label";

// Definir o esquema de validação
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Nome da equipa deve ter pelo menos 3 caracteres",
  }),
  description: z.string().optional(),
});

// Definir o tipo dos valores do formulário
type CreateTeamFormValues = z.infer<typeof formSchema>;

export default function CriarEquipePage() {
  const router = useRouter()
  const { user, updateUserRole, isTeamLeader } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dbStatus, setDbStatus] = useState({
    uuidExtension: false,
    teamsTable: false,
    teamMembersTable: false,
    teamsRLS: false,
    teamMembersRLS: false,
    teamsPolicies: false,
    teamMembersPolicies: false,
    createPromoterTeam: false
  })
  
  // Configurar o formulário
  const form = useForm<CreateTeamFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Verificar a configuração do banco de dados
  useEffect(() => {
    // Verificar tabela de equipes
    const checkTeamsTable = async () => {
      return await supabase
        .from('teams')
        .select('id')
        .limit(1);
    };
    
    // Verificar tabela de membros
    const checkMembersTable = async () => {
      return await supabase
        .from('team_members')
        .select('id')
        .limit(1);
    };
    
    // Processar status do banco
    const processDbStatus = (teamsError: any, membersError: any) => {
      setDbStatus({
        uuidExtension: false,
        teamsTable: !teamsError || teamsError.code !== '42P01',
        teamMembersTable: !membersError || membersError.code !== '42P01',
        teamsRLS: !teamsError || teamsError.code !== '42501',
        teamMembersRLS: !membersError || membersError.code !== '42501',
        teamsPolicies: !teamsError || teamsError.code !== '42501',
        teamMembersPolicies: !membersError || membersError.code !== '42501',
        createPromoterTeam: false
      });
    };

    const checkDatabaseSetup = async () => {
      if (!user) return;
      
      setDiagnosisLoading(true);
      try {
        const { error: teamsError } = await checkTeamsTable();
        const { error: membersError } = await checkMembersTable();
        
        processDbStatus(teamsError, membersError);
      } catch (e) {
        console.error('Erro ao verificar configuração do banco de dados:', e);
      } finally {
        setDiagnosisLoading(false);
      }
    };
    
    checkDatabaseSetup();
  }, [user, supabase]);
  
  // Verificar se o usuário já é líder de equipe
  const checkIfAlreadyTeamLeader = () => {
    console.log("Verificando se o utilizador já é líder de equipa (usando estado isTeamLeader):");
    if (isTeamLeader) {
      toast.error("Já é líder de uma equipa");
      router.push("/app/chefe-equipe/dashboard");
      return true;
    }
    return false;
  };
  
  // Função para criar equipe
  const onSubmit = async (formData: CreateTeamFormValues) => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se o usuário já é líder de equipe
      if (checkIfAlreadyTeamLeader()) return;
      
      // Verificar se o usuário está autenticado
      if (!user || !user.id) {
        toast.error("Precisa de estar autenticado para criar uma equipa");
        setLoading(false);
        return;
      }
      
      console.log("Criando equipa com os dados:", formData);
      console.log("ID do utilizador:", user.id.substring(0, 8) + '...');
      console.log("Metadados atuais do utilizador:", user.user_metadata);
      
      // Chamar a função RPC para criar a equipe
      const { data: teamResponse, error: rpcError } = await supabase.rpc("create_promoter_team_v2", {
        user_id: user.id,
        team_name: formData.name,
        team_description: formData.description || null,
      });
      
      if (rpcError) {
        throw new Error(`Erro ao criar equipe: ${rpcError.message}`);
      }
      
      if (!teamResponse) {
        throw new Error('ID da equipe não foi retornado após a criação');
      }
      
      console.log("Resposta da função create_promoter_team_v2:", teamResponse);
      
      // Extrair informações da equipe do objeto retornado
      const teamId = teamResponse.id;
      const teamCode = teamResponse.team_code;
      const teamName = teamResponse.team_name;
      
          console.log("Team ID extraído do objeto JSONB:", teamId);
          console.log("Team Code:", teamCode);
          console.log("Team Name:", teamName);
      
      // Função auxiliar para atualizar metadados com retry
      const updateMetadataWithRetry = async (retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            // Tentar obter a sessão atual
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !session) {
              console.log("Sessão não encontrada, aguardando...");
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            
            // Atualizar metadados do usuário
            const { error: metadataError } = await supabase.auth.updateUser({
              data: {
                role: 'chefe-equipe',
                previous_role: user?.user_metadata?.role || 'promotor',
                team_id: teamId,
                team_code: teamCode,
                team_name: teamName,
                team_role: 'leader'
              }
            });
            
            if (!metadataError) {
              console.log("Metadados atualizados com sucesso!");
              return true;
            }
            
            console.log(`Tentativa ${i + 1} falhou, aguardando próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
          } catch (error) {
            console.error(`Erro na tentativa ${i + 1}:`, error);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        return false;
      };
      
      // Atualizar o papel do usuário primeiro
      console.log("Atualizando papel do utilizador para chefe-equipa...");
      await updateUserRole('chefe-equipe');
        
      // Aguardar um momento para a sessão se atualizar
      await new Promise(resolve => setTimeout(resolve, 1000));
        
      // Tentar atualizar os metadados com retry
      const metadataUpdateSuccess = await updateMetadataWithRetry();
      
      if (!metadataUpdateSuccess) {
        console.error("Não foi possível atualizar os metadados após várias tentativas");
        // Continuar mesmo assim, já que a equipe foi criada e o papel foi atualizado
      }
      
      // Mostrar mensagem de sucesso e redirecionar
      toast.success('Equipa criada com sucesso! Você agora é um Chefe de Equipe.');
      router.push('/app/chefe-equipe/dashboard');
      
    } catch (error) {
      console.error('Erro ao criar equipa:', error);
      const errorMsg = error instanceof Error 
        ? `Erro: ${error.message}` 
        : 'Ocorreu um erro desconhecido ao criar a equipa. Tente novamente.';
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  if (diagnosisLoading) {
    return (
      <div className="container max-w-2xl py-8 flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Verificando configurações do banco de dados...</p>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto p-4 md:p-8">
      <Link href="/app/promotor/equipes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para equipas
      </Link>
      
      <Card className="max-w-lg mx-auto">
        <CardHeader className="text-center">
          <Users className="h-12 w-12 mx-auto text-primary mb-4" />
          <CardTitle>Criar Nova Equipa</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar a sua própria equipa de promotores.
            Ao criar a sua própria equipa, tornar-se-á um Chefe de Equipa, mantendo também os benefícios de Promotor.
          </CardDescription>
        </CardHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent>
              <div className="space-y-4 max-w-sm mx-auto">
                <div className="space-y-1">
                  <Label htmlFor="team-name">Nome da Equipa</Label>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            disabled={loading}
                            placeholder="Digite o nome da sua equipa"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Este será o nome exibido para promotores e organizadores.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="description">Descrição (Opcional)</Label>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            disabled={loading}
                            placeholder="Descreva a sua equipa"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="text-sm text-muted-foreground">
                    Uma breve descrição da sua equipa e dos seus objetivos.
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
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    A Criar...
                  </>
                ) : (
                  'Criar Equipa'
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
} 