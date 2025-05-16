import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';

// Schema de validação
const registerSchema = z.object({
  phone: z.string().min(9, 'O telefone deve ter pelo menos 9 dígitos'),
  email: z.string().email('Email inválido'),
  firstName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'O apelido deve ter pelo menos 2 caracteres'),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de data inválido').optional().or(z.literal('')),
  postalCode: z.string().regex(/^\d{4}-\d{3}$/, 'Formato: 4750-850'),
  gender: z.enum(['M', 'F', 'O']).optional(),
  password: z.string().min(8, 'A palavra-passe deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(1, 'Confirma a tua palavra-passe')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword']
});

type RegisterFormData = z.infer<typeof registerSchema>;

interface ClientRegistrationFormProps {
  onSuccess: (userData: any) => void;
  onBack: () => void;
  phone?: string;
}

export default function ClientRegistrationForm({ 
  onSuccess, 
  onBack, 
  phone = '' 
}: ClientRegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    watch
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: phone,
      email: '',
      firstName: '',
      lastName: '',
      birthDate: '',
      postalCode: '',
      gender: undefined,
      password: '',
      confirmPassword: ''
    }
  });
  
  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    // Remover campos em branco ou não necessários para a API
    const apiData = {
      phone: data.phone,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate || undefined,
      postalCode: data.postalCode,
      gender: data.gender,
      password: data.password
    };
    
    try {
      console.log('Enviando dados de registro:', { ...apiData, password: '***' });
      
      // 1. Primeiro, registrar o usuário via API
      const response = await fetch('/api/client-auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiData)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('Erro na resposta do servidor:', result);
        
        // Mensagens de erro mais específicas baseadas no erro retornado
        if (result.error === 'Número de telefone já registrado' || result.error === 'Este telefone já está registrado') {
          throw new Error('Este número de telefone já está registrado. Tente fazer login.');
        }
        
        if (result.error === 'Email já registrado' || result.error === 'Este email já está registrado') {
          throw new Error('Este email já está registrado. Tente fazer login.');
        }
        
        if (result.details && result.details.includes('row-level security')) {
          throw new Error('Erro de permissão no servidor. Por favor, contacte o suporte.');
        }
        
        throw new Error(result.error || 'Erro ao registar');
      }
      
      console.log('Registro bem-sucedido:', result);
      
      // 2. Se o registro for bem sucedido, fazer login do lado do cliente
      try {
        // Obter cliente Supabase (usando padrão singleton)
        const supabase = createSupabaseClient();
        
        // Autenticar usuário com email e senha fornecidos
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (loginError) {
          console.warn('Aviso: Login automático falhou após registro', loginError);
          // Tentar uma vez mais após um pequeno delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
          });
          
          if (retryError) {
            console.error('Falha na segunda tentativa de login:', retryError);
          } else {
            console.log('Login automático bem-sucedido após segunda tentativa');
          }
          
        } else {
          console.log('Login automático após registro bem-sucedido');
        }
        
        // Garantir que a sessão está atualizada antes de continuar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (loginErr) {
        console.warn('Falha ao tentar login automático após registro:', loginErr);
      }
      
      // Informar sucesso e passar os dados do resultado
      onSuccess(result);
      
    } catch (error) {
      console.error('Erro ao registrar:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao registrar');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenderChange = (value: string) => {
    if (value === 'M' || value === 'F' || value === 'O') {
      setValue('gender', value as 'M' | 'F' | 'O');
    }
  };
  
  return (
    <div className="space-y-2 w-full max-w-md auth-dialog">
      <div className="text-center mb-2">
        <h2 className="text-xl font-bold">Criar Conta</h2>
        <p className="text-xs text-muted-foreground">
          Preenche os campos obrigatórios (*)
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
        
        {/* Informações Básicas - nome e sobrenome */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-xs font-medium">Nome*</Label>
            <Input
              id="firstName"
              placeholder="Nome"
              className="h-8 text-sm py-1"
              {...register('firstName')}
              disabled={isLoading}
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-xs font-medium">Apelido*</Label>
            <Input
              id="lastName"
              placeholder="Apelido"
              className="h-8 text-sm py-1"
              {...register('lastName')}
              disabled={isLoading}
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        
        {/* Contato - telefone e email */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-xs font-medium">Telefone*</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Telefone"
              className="h-8 text-sm py-1"
              {...register('phone')}
              disabled={isLoading || !!phone}
            />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="email" className="text-xs font-medium">Email*</Label>
            <Input
              id="email"
              type="email"
              placeholder="Email"
              className="h-8 text-sm py-1"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>
        
        {/* Código postal e data de nascimento */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="postalCode" className="text-xs font-medium">Código Postal*</Label>
            <Input
              id="postalCode"
              placeholder="0000-000"
              className="h-8 text-sm py-1"
              pattern="\d{4}-\d{3}"
              inputMode="numeric"
              maxLength={8}
              {...register('postalCode', {
                onChange: (e) => {
                  // Formatar automaticamente com o hífen após 4 dígitos
                  const value = e.target.value.replace(/[^\d]/g, '');
                  if (value.length > 4) {
                    e.target.value = `${value.slice(0, 4)}-${value.slice(4, 7)}`;
                  } else if (value.length === 4) {
                    e.target.value = `${value}-`;
                  } else {
                    e.target.value = value;
                  }
                }
              })}
              disabled={isLoading}
            />
            {!errors.postalCode && (
              <p className="text-[10px] text-muted-foreground">Formato: 0000-000</p>
            )}
            {errors.postalCode && (
              <p className="text-xs text-destructive">{errors.postalCode.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="birthDate" className="text-xs font-medium">Data Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              className="h-8 text-sm py-1"
              {...register('birthDate')}
              disabled={isLoading}
              placeholder="dd/mm/aaaa"
            />
            {errors.birthDate && (
              <p className="text-xs text-destructive">{errors.birthDate.message}</p>
            )}
          </div>
        </div>
        
        {/* Género e senha */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="gender" className="text-xs font-medium">Género</Label>
            <Select onValueChange={handleGenderChange} disabled={isLoading}>
              <SelectTrigger id="gender" className="h-8 text-sm py-0">
                <SelectValue placeholder="Seleciona" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
                <SelectItem value="O">Outro</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <p className="text-xs text-destructive">{errors.gender.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="password" className="text-xs font-medium">Palavra-passe*</Label>
            <Input
              id="password"
              type="password"
              placeholder="Palavra-passe"
              className="h-8 text-sm py-1"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>
        </div>
        
        {/* Confirmar senha */}
        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirmar Palavra-passe*</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirmar palavra-passe"
            className="h-8 text-sm py-1"
            {...register('confirmPassword')}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        
        {/* Botões */}
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="w-1/3 h-8 text-xs"
          >
            Voltar
          </Button>
          
          <Button type="submit" disabled={isLoading} className="w-2/3 h-8 text-xs">
            {isLoading ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                A registar...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
} 