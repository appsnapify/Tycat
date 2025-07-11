import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';

// Schema de validação
const loginSchema = z.object({
  phone: z.string().min(9, 'O telefone deve ter pelo menos 9 dígitos'),
  password: z.string().min(1, 'A palavra-passe é obrigatória')
});

type LoginFormData = z.infer<typeof loginSchema>;

interface ClientLoginFormProps {
  onSuccess: (userData: any) => void;
  onBack?: () => void;
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
        requestBody = {
          userId,
          password: data.password
        };
        endpoint = '/api/client-auth/direct-login';
      } else {
        // Login normal por telefone
        requestBody = {
          phone: data.phone,
          password: data.password
        };
        endpoint = '/api/client-auth/login';
      }
      
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
      
      onSuccess(result.user);
      
    } catch (err: any) {
      console.error('Erro durante login:', err);
      setError(err.message || 'Ocorreu um erro ao iniciar sessão');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Iniciar Sessão</h2>
        <p className="text-sm text-gray-500 mt-2">
          Entre com o teu telefone e palavra-passe
        </p>
        {userId && (
          <p className="text-xs text-gray-400 mt-1">
            Utilizador identificado automaticamente
          </p>
        )}
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Telefone</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="O teu telefone"
            {...register('phone')}
            disabled={isLoading || !!phone}
            className="text-sm"
          />
          {errors.phone && (
            <p className="text-xs text-red-500">{errors.phone.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">Palavra-passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="A tua palavra-passe"
            {...register('password')}
            disabled={isLoading}
            className="text-sm"
          />
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>
        
        <div className="flex flex-col gap-2 pt-4">
          <Button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A iniciar sessão...
              </>
            ) : (
              'Entrar'
            )}
          </Button>
          
          {onBack && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onBack} 
              disabled={isLoading}
              className="text-sm"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
} 