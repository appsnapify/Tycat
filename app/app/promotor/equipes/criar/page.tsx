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
    message: "Nome da equipe deve ter pelo menos 3 caracteres",
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
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')
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
  const [activeTab, setActiveTab] = useState<string>('normal')
  
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
    console.log("Verificando se o usuário já é líder de equipe (usando estado isTeamLeader):");
    if (isTeamLeader) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você já é líder de uma equipe",
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
          description: "Você precisa estar autenticado para criar uma equipe",
        });
        setLoading(false);
        return;
      }
      
      console.log("Criando equipe com os dados:", formData);
      console.log("ID do usuário:", user.id);
      console.log("Metadados atuais do usuário:", user.user_metadata);
      
      // Chamar a função RPC para criar a equipe
      const { data, error: rpcError } = await supabase.rpc("create_promoter_team_v2", {
        p_team_name: formData.name,
        p_team_description: formData.description || null,
      });
      
      if (rpcError) {
        console.error("Erro ao criar equipe RPC:", rpcError);
        
        if (rpcError.message?.includes('já é')) {
          toast({
            variant: "destructive",
            title: "Você já é líder de uma equipe",
            description: "Um usuário só pode liderar uma equipe por vez.",
          });
          router.push("/app/chefe-equipe/dashboard");
        } else if (rpcError.message?.includes('permissão')) {
          toast({
            variant: "destructive",
            title: "Permissão negada",
            description: "Você não tem permissão para criar uma equipe",
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
            title: "Erro ao criar equipe",
            description: rpcError.message || "Ocorreu um erro ao criar a equipe",
          });
        }
        
        setError(rpcError.message || "Ocorreu um erro ao criar a equipe");
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
        setError("Erro: Resposta nula ao criar equipe");
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
          console.log("Tentando encontrar o ID da equipe em:", data);
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
        console.error("Não foi possível extrair o ID da equipe da resposta:", data);
        setError("Erro ao obter ID da equipe criada");
        setLoading(false);
        return;
      }
      
      // Verificar se os metadados foram atualizados automaticamente pela função SQL
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log("Metadados do usuário após criar equipe:", userData?.user?.user_metadata);
      
      const userMetadata = userData?.user?.user_metadata || {};
      const metadataTeamId = userMetadata.team_id;
      const metadataRole = userMetadata.role;
      
      // Se a função SQL não atualizou os metadados corretamente, fazemos manualmente
      if (userError || !metadataTeamId || metadataTeamId !== teamId || metadataRole !== 'chefe-equipe') {
        console.log("Atualizando metadados do usuário manualmente...");
        
        // Atualizar o papel do usuário
        await updateUserRole("chefe-equipe");
        
        // Atualizar metadados adicionais se necessário
        if (!metadataTeamId || metadataTeamId !== teamId) {
          try {
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                team_id: teamId,
                team_code: teamCode || userMetadata.team_code,
                team_name: teamName || formData.name,
                role: 'chefe-equipe',
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
        console.log("Metadados do usuário já foram atualizados pela função SQL");
      }
      
      // Aguardar um momento para que a sessão do usuário seja atualizada
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Força a atualização da sessão
      await supabase.auth.refreshSession();
      
      // Mostrar notificação de sucesso
      toast({
        title: "Sucesso!",
        description: "Equipe criada com sucesso. Você agora é um Chefe de Equipe!",
      });
      
      // Pequeno atraso para garantir que a sessão seja atualizada
      setTimeout(() => {
        // Redirecionar para o dashboard de chefe de equipe
        console.log("Redirecionando para o dashboard de chefe de equipe");
        router.push("/app/chefe-equipe/dashboard");
      }, 1500);
    } catch (err: any) {
      console.error("Erro GERAL ao criar equipe:", err);
      toast({
        variant: "destructive",
        title: "Erro",
        description: err.message || "Ocorreu um erro inesperado ao criar a equipe",
      });
      setError(err.message || "Ocorreu um erro inesperado ao criar a equipe");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSimulatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simular a criação de uma equipe usando localStorage
      const simulatedTeam = {
        id: crypto.randomUUID(),
        name: teamName,
        description: teamDescription,
        team_code: generateTeamCode(),
        created_by: user?.id,
        created_at: new Date().toISOString(),
        is_simulated: true
      };
      
      // Salvar no localStorage
      const existingTeams = JSON.parse(localStorage.getItem('simulated_teams') || '[]');
      existingTeams.push(simulatedTeam);
      localStorage.setItem('simulated_teams', JSON.stringify(existingTeams));
      
      // Salvar relação do membro
      const memberRelation = {
        id: crypto.randomUUID(),
        team_id: simulatedTeam.id,
        user_id: user?.id,
        role: 'leader',
        joined_at: new Date().toISOString(),
        is_simulated: true
      };
      
      const existingMembers = JSON.parse(localStorage.getItem('simulated_team_members') || '[]');
      existingMembers.push(memberRelation);
      localStorage.setItem('simulated_team_members', JSON.stringify(existingMembers));
      
      toast.success('Equipe simulada criada com sucesso! Você agora é um Chefe de Equipe (simulado).');
      
      // Apenas atualizar o contexto local para simulação
      updateUserRole('team-leader');
      
      // Usar setTimeout para garantir que o evento de navegação ocorra após a conclusão da função
      setTimeout(() => {
        router.push('/app/chefe-equipe/dashboard');
      }, 100);
    } catch (simError: any) {
      toast.error('Erro ao criar equipe simulada: ' + simError.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Função auxiliar para gerar código de equipe para simulação
  const generateTeamCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = 'TEAM-';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
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
    <div className="container max-w-2xl py-8">
      <Link href="/app/promotor/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para o painel
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>Criar Nova Equipe</CardTitle>
          <CardDescription>
            Preencha os detalhes abaixo para criar sua própria equipe de promotores.
            Ao criar sua própria equipe, você se tornará um Chefe de Equipe, mantendo também os benefícios de Promotor.
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="normal" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="normal">Criação Normal</TabsTrigger>
            <TabsTrigger value="simulation">Modo Simulação</TabsTrigger>
          </TabsList>
          <TabsContent value="normal">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="team-name">Nome da Equipe</Label>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              disabled={loading}
                              placeholder="Digite o nome da sua equipe"
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
                              placeholder="Descreva a sua equipe"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-sm text-muted-foreground">
                      Uma breve descrição da sua equipe e seus objetivos.
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
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Equipe'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="simulation">
            <form onSubmit={handleSimulatedSubmit}>
              <CardContent className="space-y-6">
                <Alert className="mb-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Modo de Simulação</AlertTitle>
                  <AlertDescription>
                    Este modo cria uma equipe simulada armazenada apenas no seu dispositivo.
                    Útil quando há problemas com o Supabase ou para testar a interface.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="team-name-sim" className="required">
                    Nome da Equipe (Simulação)
                  </Label>
                  <Input
                    id="team-name-sim"
                    placeholder="Digite o nome da sua equipe"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Este nome será visível apenas neste dispositivo.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team-description-sim">
                    Descrição (Simulação)
                  </Label>
                  <Textarea
                    id="team-description-sim"
                    placeholder="Descrição sobre a sua equipe (opcional)"
                    value={teamDescription}
                    onChange={(e) => setTeamDescription(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uma breve descrição para sua equipe simulada.
                  </p>
                </div>
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
                      Criar Equipe Simulada
                    </>
                  ) : (
                    'Criar Equipe Simulada'
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
} 