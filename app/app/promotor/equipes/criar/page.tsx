"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
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
import { useToast } from "@/components/ui/use-toast";
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
  const supabase = createClientComponentClient()
  const { toast } = useToast()
  
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
    const checkDatabaseSetup = async () => {
      if (!user) return;
      
      setDiagnosisLoading(true);
      try {
        // Verificar tabelas
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('id')
          .limit(1);
        
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select('id')
          .limit(1);
        
        setDbStatus({
          uuidExtension: false, // Não temos como verificar facilmente
          teamsTable: !teamsError || teamsError.code !== '42P01',
          teamMembersTable: !membersError || membersError.code !== '42P01',
          teamsRLS: !teamsError || teamsError.code !== '42501',
          teamMembersRLS: !membersError || membersError.code !== '42501',
          teamsPolicies: !teamsError || teamsError.code !== '42501',
          teamMembersPolicies: !membersError || membersError.code !== '42501',
          createPromoterTeam: false // Não verificamos isso agora
        });
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
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Já é líder de uma equipa",
      });
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
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Precisa de estar autenticado para criar uma equipa",
        });
        setLoading(false);
        return;
      }
      
      console.log("Criando equipa com os dados:", formData);
      console.log("ID do utilizador:", user.id);
      console.log("Metadados atuais do utilizador:", user.user_metadata);
      
      // Chamar a função RPC para criar a equipe
      const { data, error: rpcError } = await supabase.rpc("create_promoter_team_v2", {
        p_team_name: formData.name,
        p_team_description: formData.description || null,
      });
      
      if (rpcError) {
        console.error("Erro ao criar equipa RPC:", rpcError);
        
        if (rpcError.message?.includes('já é')) {
          toast({
            variant: "destructive",
            title: "Já é líder de uma equipa",
            description: "Um utilizador só pode liderar uma equipa de cada vez.",
          });
          router.push("/app/chefe-equipe/dashboard");
        } else if (rpcError.message?.includes('permissão')) {
          toast({
            variant: "destructive",
            title: "Permissão negada",
            description: "Não tem permissão para criar uma equipa",
          });
        } else if (rpcError.code === '42501') {
          toast({
            variant: "destructive",
            title: "Erro de permissão",
            description: "Problemas com as políticas de segurança. Por favor, execute o script SQL fornecido.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Erro ao criar equipa",
            description: rpcError.message || "Ocorreu um erro ao criar a equipa",
          });
        }
        
        setError(rpcError.message || "Ocorreu um erro ao criar a equipa");
        setLoading(false);
        return;
      }
      
      console.log("Resposta da função create_promoter_team_v2:", data);
      
      // Extrair o ID da equipe da resposta
      let teamId: string | undefined;
      let teamCode: string | undefined;
      let teamName: string | undefined;
      
      if (data === null || data === undefined) {
        console.error("Resposta nula da função create_promoter_team_v2");
        setError("Erro: Resposta nula ao criar equipa");
        setLoading(false);
        return;
      }
      
      if (typeof data === "object" && data !== null) {
        // Nova versão: retorna um objeto JSONB
        if ('id' in data) {
          teamId = data.id;
          teamCode = data.team_code;
          teamName = data.name;
          console.log("Team ID extraído do objeto JSONB:", teamId);
          console.log("Team Code:", teamCode);
          console.log("Team Name:", teamName);
        } else if ('team_id' in data) {
          // Formato alternativo possível
          teamId = data.team_id;
          teamCode = data.team_code;
          teamName = data.team_name;
          console.log("Team ID extraído do campo team_id:", teamId);
          console.log("Team Code:", teamCode);
          console.log("Team Name:", teamName);
        } else {
          // Tentar encontrar qualquer campo que possa ser um UUID
          console.log("Tentando encontrar o ID da equipa em:", data);
          for (const key in data) {
            const value = data[key];
            if (typeof value === 'string' && 
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
              teamId = value;
              console.log(`Team ID encontrado no campo ${key}:`, teamId);
              break;
            }
          }
        }
      } else if (typeof data === "string") {
        // Versão antiga: retorna apenas o UUID como string
        teamId = data;
        console.log("Team ID extraído diretamente da string:", teamId);
      }
      
      if (!teamId) {
        console.error("Não foi possível extrair o ID da equipa da resposta:", data);
        setError("Erro ao obter ID da equipa criada");
        setLoading(false);
        return;
      }
      
      // Verificar se os metadados foram atualizados automaticamente pela função SQL
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log("Metadados do utilizador após criar equipa:", userData?.user?.user_metadata);
      
      const userMetadata = userData?.user?.user_metadata || {};
      const metadataTeamId = userMetadata.team_id;
      const metadataRole = userMetadata.role;
      
      // Se a função SQL não atualizou os metadados corretamente, fazemos manualmente
      if (userError || !metadataTeamId || metadataTeamId !== teamId || metadataRole !== 'chefe-equipa') {
        console.log("Atualizando metadados do utilizador manualmente...");
        
        // Atualizar o papel do utilizador
        await updateUserRole("chefe-equipa");
        
        // Atualizar metadados adicionais se necessário
        if (!metadataTeamId || metadataTeamId !== teamId) {
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                team_id: teamId,
                team_code: teamCode || userMetadata.team_code,
                team_name: teamName || formData.name,
                role: 'chefe-equipa',
                previous_role: userMetadata.role || 'promotor'
              }
            });
            
            if (updateError) {
              console.error("Erro ao atualizar metadados adicionais:", updateError);
            } else {
              console.log("Metadados adicionais atualizados com sucesso");
            }
          } catch (updateError) {
            console.error("Exceção ao atualizar metadados adicionais:", updateError);
          }
        }
      } else {
        console.log("Metadados do utilizador já foram atualizados pela função SQL");
      }
      
      // Aguardar um momento para que a sessão do utilizador seja atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Força a atualização da sessão
      await supabase.auth.refreshSession();
      
      // Mostrar notificação de sucesso
      toast({
        title: "Sucesso!",
        description: "Equipa criada com sucesso. Agora é um Chefe de Equipa!",
      });
      
      // Pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(() => {
        // Redirecionar para o dashboard de chefe de equipa
        console.log("Redirecionando para o dashboard de chefe de equipa");
        router.push("/app/chefe-equipe/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error("Erro GERAL ao criar equipa:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Ocorreu um erro inesperado ao criar a equipa",
      });
      setError(err.message || "Ocorreu um erro inesperado ao criar a equipa");
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