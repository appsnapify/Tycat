import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';

// Schema de validação
const registerSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres"),
  email: z.string().email("Email inválido").optional().nullable(),
  first_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  last_name: z.string().optional().nullable(),
  birth_date: z.date().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "Confirmação de senha é obrigatória")
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

interface ClientRegistrationFormProps {
  phone: string;
  onSuccess: () => void;
  onBack?: () => void;
}

export default function ClientRegistrationForm({
  phone,
  onSuccess,
  onBack
}: ClientRegistrationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Inicializar formulário com react-hook-form e zod
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone,
      email: null,
      first_name: '',
      last_name: null,
      birth_date: null,
      postal_code: null,
      gender: null,
      password: '',
      confirm_password: '',
    }
  });
  
  // Função de envio
  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setSubmitting(true);
      
      const response = await fetch('/api/client-auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: values.phone,
          email: values.email,
          first_name: values.first_name,
          last_name: values.last_name,
          birth_date: values.birth_date ? format(values.birth_date, 'yyyy-MM-dd') : null,
          postal_code: values.postal_code,
          gender: values.gender,
          password: values.password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Falha no registro');
      }
      
      toast({
        title: 'Registro realizado com sucesso',
        description: 'Sua conta foi criada!'
      });
      
      onSuccess();
    } catch (error) {
      console.error('Erro ao registrar:', error);
      
      toast({
        variant: 'destructive',
        title: 'Erro no registro',
        description: error instanceof Error ? error.message : 'Não foi possível criar a conta'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Criar Conta</h2>
        <p className="text-muted-foreground mt-2">
          Preencha os dados abaixo para criar sua conta
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
                  <Input {...field} disabled={true} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome*</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Seu nome" 
                    {...field} 
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Seu sobrenome" 
                    {...field} 
                    value={field.value || ''}
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email"
                    placeholder="seu.email@exemplo.com" 
                    {...field} 
                    value={field.value || ''}
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Nascimento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={submitting}
                        >
                          {field.value ? (
                            format(field.value, "P", { locale: ptBR })
                          ) : (
                            <span>Selecione</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={date => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gênero</FormLabel>
                  <Select
                    disabled={submitting}
                    onValueChange={field.onChange}
                    value={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="postal_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código Postal</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="0000-000" 
                    {...field} 
                    value={field.value || ''}
                    disabled={submitting}
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
                <FormLabel>Senha*</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Pelo menos 6 caracteres" 
                    {...field} 
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar Senha*</FormLabel>
                <FormControl>
                  <Input 
                    type="password"
                    placeholder="Repetir a senha" 
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
              {submitting ? 'Processando...' : 'Criar Conta'}
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