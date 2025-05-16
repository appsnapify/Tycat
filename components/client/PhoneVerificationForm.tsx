import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/components/ui/use-toast';

// Schema de validação
const phoneSchema = z.object({
  phone: z.string().min(8, "Telefone deve ter pelo menos 8 caracteres")
});

type PhoneFormValues = z.infer<typeof phoneSchema>;

interface PhoneVerificationFormProps {
  onSubmit: (phone: string) => Promise<void>;
  isLoading?: boolean;
}

export default function PhoneVerificationForm({
  onSubmit,
  isLoading = false
}: PhoneVerificationFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Inicializar formulário com react-hook-form e zod
  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      phone: ''
    }
  });
  
  // Função de envio
  const handleSubmit = async (values: PhoneFormValues) => {
    try {
      setSubmitting(true);
      await onSubmit(values.phone);
    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível verificar o telefone. Tente novamente.'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Acesse a Guest List</h2>
        <p className="text-muted-foreground mt-2">
          Informe seu número de telefone para continuar.
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
                    placeholder="+351 912 345 678" 
                    {...field} 
                    disabled={submitting || isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={submitting || isLoading}
          >
            {submitting || isLoading ? 'Verificando...' : 'Continuar'}
          </Button>
        </form>
      </Form>
    </div>
  );
} 