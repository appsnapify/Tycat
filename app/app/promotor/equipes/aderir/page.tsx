"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import { Users } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuth } from "@/hooks/use-auth";

// Definir o esquema de validação
const formSchema = z.object({
  teamCode: z.string().min(1, {
    message: "Código da equipa é obrigatório",
  }),
});

// Definir o tipo dos valores do formulário
type JoinTeamFormValues = z.infer<typeof formSchema>;

const JoinTeamPage = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  const { user, updateUserRole } = useAuth();

  // Configurar o formulário
  const form = useForm<JoinTeamFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  // Função para aderir a uma equipe usando o código
  const onSubmit = async (formData: JoinTeamFormValues) => {
    setIsLoading(true);
    
    try {
      // Obter o ID do usuário atual
      const userId = user?.id;
      
      if (!userId) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuário não autenticado",
        });
        setIsLoading(false);
        return;
      }
      
      // Utilizar a função RPC para aderir à equipe usando o código
      const { data: joinResult, error: joinError } = await supabase
        .rpc('join_team_with_code', {
          user_id_param: userId,
          team_code_param: formData.teamCode
        });
      
      if (joinError) {
        console.error('Erro ao aderir à equipe:', joinError);
        toast({
          variant: "destructive",
          title: "Erro ao aderir à equipe",
          description: joinError.message || "Código inválido ou equipe não encontrada",
        });
        setIsLoading(false);
        return;
      }
      
      console.log('Adesão realizada com sucesso:', joinResult);
      
      // Atualizar o contexto de autenticação para refletir o novo papel do usuário
      updateUserRole('promotor');
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Adesão realizada com sucesso!",
        description: `Você agora é membro da equipe ${joinResult.team_name}`,
      });
      
      // Redirecionar para o dashboard do promotor
      router.push('/app/promotor/dashboard');
    } catch (error) {
      console.error('Erro ao aderir à equipe:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao processar sua solicitação",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full p-6 space-y-6">
      <Heading
        title="Aderir a uma Equipe"
        description="Entre em uma equipe existente usando o código da equipe"
        icon={Users}
        iconColor="text-blue-500"
        bgColor="bg-blue-100"
      />

      <div className="max-w-md mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código da Equipe</FormLabel>
                  <FormControl>
                    <Input
                      disabled={isLoading}
                      placeholder="ex: TEAM-A1B2C"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button disabled={isLoading} type="submit" className="w-full">
              {isLoading ? "Processando..." : "Aderir à Equipe"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default JoinTeamPage; 