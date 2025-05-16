import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  password: z.string().min(1, "Senha é obrigatória")
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface ClientLoginFormProps {
  phone: string;
  onSuccess: () => void;
  onBack?: () => void;
}

export default function ClientLoginForm({
  phone,
  onSuccess,
  onBack
}: ClientLoginFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Inicializar formulário com react-hook-form e zod
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone,
      password: ''
    }
  });
  
  // Função de envio
  const handleSubmit = async (values: LoginFormValues) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: values.phone,
          password: values.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha no login');
      }
      
      toast({
        title: 'Login realizado com sucesso',
        description: 'Você está conectado!'
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      
      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: error instanceof Error ? error.message : 'Telefone ou senha incorretos'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Login</h2>
        <p className="text-muted-foreground mt-2">
          Entre com suas credenciais para acessar a guest list
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    disabled={true}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Sua senha" 
                    {...field} 
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex flex-col space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? 'Processando...' : 'Entrar'}
            </Button>
            
            {onBack && (
              <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={onBack}
                disabled={submitting}
              >
                Voltar
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
} 