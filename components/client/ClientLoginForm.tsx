'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import Link from 'next/link';

// Estilos para o PhoneInput
const phoneInputStyles = `
  .phone-input-white input {
    background-color: white !important;
    color: black !important;
  }
  .phone-input-white input:focus {
    background-color: white !important;
    color: black !important;
  }
  .phone-input-white .PhoneInputInput {
    background-color: white !important;
    color: black !important;
  }
`;

// ✅ COMPLEXIDADE: 5 pontos (1 base + 4 condições)
export default function ClientLoginForm() {
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useClientAuth();
  const router = useRouter();

  // ✅ FUNÇÃO: Validar formulário (Complexidade: 2)
  const validateForm = (): string | null => {
    if (!phone?.trim()) return 'Número de telemóvel é obrigatório'; // +1
    if (!password.trim()) return 'Password é obrigatória'; // +1
    return null;
  };

  // ✅ FUNÇÃO: Handle submit (Complexidade: 4)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) { // +1
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login({ phone, password });
      
      if (result.success) { // +1
        toast.success('Login realizado com sucesso!');
        router.push('/user/dashboard');
      } else { // +1
        setError(result.error || 'Erro no login');
        if (result.error?.includes('credenciais')) { // +1
          toast.error('Credenciais inválidas');
        } else {
          toast.error(result.error || 'Erro no login');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Erro de conexão. Tente novamente.');
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Entrar na TYCAT
        </CardTitle>
        <CardDescription className="text-slate-600">
          Aceda à sua área pessoal
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Número de Telemóvel
            </label>
            <div className="phone-input-white">
              <PhoneInput
                international
                defaultCountry="PT"
                value={phone}
                onChange={(value) => setPhone(value || '')}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-emerald-500 bg-white h-12"
                placeholder="Introduza o seu número"
                style={{
                  '--PhoneInput-color--focus': '#10b981',
                  '--PhoneInputCountrySelect-marginRight': '0.5rem',
                } as any}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a sua password"
                className="pl-10 pr-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isLoading ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
        
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">ou</span>
            </div>
          </div>
          
          <div className="text-sm text-center text-slate-600">
            Não tem conta?{' '}
            <Link 
              href="/user/register" 
              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
    <style dangerouslySetInnerHTML={{ __html: phoneInputStyles }} />
  </>
  );
}
