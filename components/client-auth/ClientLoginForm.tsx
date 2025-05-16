import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(9, 'O telefone deve ter pelo menos 9 dígitos'),
  password: z.string().min(1, 'A palavra-passe é obrigatória')
});

type LoginFormData = z.infer<typeof loginSchema>;

interface ClientLoginFormProps {
  onSuccess: (userData: any) => void;
  onBack: () => void;
  phone?: string;
  userId?: string | null;
}

export default function ClientLoginForm({ 
  onSuccess, 
  onBack, 
  phone = '',
  userId = null
}: ClientLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: phone,
      password: ''
    }
  });
  
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let response;
      let requestBody;
      let endpoint = '';
      
      // Se temos um userId, usar o endpoint de login direto
      if (userId) {
        console.log('Usando login direto com ID:', userId);
        requestBody = {
          userId,
          password: data.password
        };
        endpoint = '/api/client-auth/direct-login';
      } else {
        // Login normal por telefone
        console.log('Usando login por telefone:', data.phone);
        requestBody = {
          phone: data.phone,
          password: data.password
        };
        endpoint = '/api/client-auth/login';
      }
      
      console.log(`Enviando requisição para ${endpoint}`);
      
      // Tente fazer a requisição com um timeout para evitar esperas indefinidas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
      
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log(`Resposta de ${endpoint} recebida com status:`, response.status);
      } catch (fetchError: any) {
        console.error(`Erro ao fazer fetch para ${endpoint}:`, fetchError);
        if (fetchError.name === 'AbortError') {
          throw new Error('A requisição demorou muito tempo. Tente novamente.');
        }
        throw new Error(`Falha na conexão: ${fetchError.message}`);
      }
      
      // Tentar obter o texto da resposta
      let responseText;
      try {
        responseText = await response.text();
      } catch (textError) {
        console.error('Erro ao obter texto da resposta:', textError);
        throw new Error('Não foi possível ler a resposta do servidor');
      }
      
      // Tentar parsear o JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON:', jsonError);
        console.error('Texto recebido:', responseText);
        throw new Error('Resposta inválida do servidor');
      }
      
      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        console.error('Resposta com erro:', result);
        throw new Error(result.error || `Erro ao iniciar sessão (${response.status})`);
      }
      
      // Verificar se temos os dados do usuário
      if (!result.user) {
        console.error('Resposta sem dados do usuário:', result);
        throw new Error('Resposta incompleta do servidor');
      }
      
      console.log('Login bem-sucedido:', result.user);
      onSuccess(result.user);
      
    } catch (err: any) {
      console.error('Erro durante login:', err);
      setError(err.message || 'Ocorreu um erro ao iniciar sessão');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4 w-full max-w-md">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Iniciar Sessão</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Entra com o teu telefone e palavra-passe
        </p>
        {userId && (
          <p className="text-xs text-muted-foreground mt-1">
            Utilizador identificado automaticamente
          </p>
        )}
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="O teu telefone"
            {...register('phone')}
            disabled={isLoading || !!phone}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="A tua palavra-passe"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 pt-2">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A iniciar sessão...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="w-full"
          >
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
} 