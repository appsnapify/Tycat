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
import { createClient } from '@/lib/supabase';

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
    
    // CORRIGIR: Mapear nomes dos campos para corresponder ao backend
    const apiData = {
      phone: data.phone,
      email: data.email,
      first_name: data.firstName, // CORRIGIDO: firstName -> first_name
      last_name: data.lastName,   // CORRIGIDO: lastName -> last_name
      birth_date: data.birthDate || null, // CORRIGIDO: undefined -> null para opcional
      postal_code: data.postalCode, // CORRIGIDO: postalCode -> postal_code
      gender: data.gender || null, // CORRIGIDO: undefined -> null para opcional
      password: data.password
    };
    
    try {
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
        
        // Mostrar detalhes da validação para debug se disponível
        if (result.details) {
          console.error('Detalhes da validação:', result.details);
        }
        
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
        
        // Mostrar detalhes de validação se disponível
        const errorMessage = result.details ? 
          `${result.error}: ${result.details}` : 
          (result.error || 'Erro ao registar');
        throw new Error(errorMessage);
      }
      
      // CORRIGIDO: Chamar onSuccess PRIMEIRO, antes do login automático
      try {
        onSuccess(result);
      } catch (successError) {
        console.error('🚨 Erro ao chamar onSuccess:', successError);
      }
      
      // 2. Login automático é opcional - não deve bloquear o fluxo
      try {
        // Obter cliente Supabase (usando padrão singleton)
        const supabase = createClient();
        
        // Autenticar usuário com email e senha fornecidos
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        });
        
        if (loginError) {
          console.warn('Aviso: Login automático falhou após registro', loginError);
          // Tentar uma vez mais mas sem delay excessivo
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
            email: data.email,
            password: data.password
          });
          
          if (retryError) {
            console.error('Falha na segunda tentativa de login:', retryError);
          }
          
        }
        
      } catch (loginErr) {
        console.warn('Falha ao tentar login automático após registro:', loginErr);
      }
      
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
    <div className="space-y-2 w-full max-w-md auth-dialog px-3 sm:px-6 pb-4 sm:pb-6">
      <div className="text-center mb-2">
        <h2 className="text-lg sm:text-xl font-bold">Criar Conta</h2>
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
        
        {/* Telefone - Readonly */}
        <div className="space-y-1">
          <Label htmlFor="phone" className="text-xs">Telefone *</Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            disabled={true}
            className="bg-muted text-xs sm:text-sm"
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
        
        {/* Email */}
        <div className="space-y-1">
          <Label htmlFor="email" className="text-xs">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="o.teu.email@exemplo.com"
            {...register('email')}
            disabled={isLoading}
            className="text-xs sm:text-sm"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        
        {/* Nome e Apelido */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="firstName" className="text-xs">Nome *</Label>
            <Input
              id="firstName"
              placeholder="Nome"
              {...register('firstName')}
              disabled={isLoading}
              className="text-xs sm:text-sm"
            />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="lastName" className="text-xs">Apelido *</Label>
            <Input
              id="lastName"
              placeholder="Apelido"
              {...register('lastName')}
              disabled={isLoading}
              className="text-xs sm:text-sm"
            />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        
        {/* Data de Nascimento e Género */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="birthDate" className="text-xs">Data Nasc.</Label>
            <Input
              id="birthDate"
              type="date"
              {...register('birthDate')}
              disabled={isLoading}
              className="text-xs"
            />
            {errors.birthDate && (
              <p className="text-xs text-destructive">{errors.birthDate.message}</p>
            )}
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="gender" className="text-xs">Género</Label>
            <Select onValueChange={handleGenderChange} disabled={isLoading}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="M" className="text-xs">Masculino</SelectItem>
                <SelectItem value="F" className="text-xs">Feminino</SelectItem>
                <SelectItem value="O" className="text-xs">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Código Postal */}
        <div className="space-y-1">
          <Label htmlFor="postalCode" className="text-xs">Código Postal *</Label>
          <Input
            id="postalCode"
            placeholder="4750-850"
            {...register('postalCode')}
            disabled={isLoading}
            className="text-xs sm:text-sm"
          />
          {errors.postalCode && (
            <p className="text-xs text-destructive">{errors.postalCode.message}</p>
          )}
        </div>
        
        {/* Palavras-passe */}
        <div className="space-y-1">
          <Label htmlFor="password" className="text-xs">Palavra-passe *</Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            {...register('password')}
            disabled={isLoading}
            className="text-xs sm:text-sm"
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="confirmPassword" className="text-xs">Confirmar Palavra-passe *</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repetir palavra-passe"
            {...register('confirmPassword')}
            disabled={isLoading}
            className="text-xs sm:text-sm"
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
        
        {/* Botões */}
        <div className="flex flex-col gap-2 pt-3">
          <Button type="submit" disabled={isLoading} className="w-full text-xs sm:text-sm">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                A criar conta...
              </>
            ) : (
              'Criar Conta'
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="text-xs"
          >
            Voltar
          </Button>
        </div>
      </form>
    </div>
  );
} 