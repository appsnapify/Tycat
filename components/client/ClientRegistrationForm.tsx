'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import Link from 'next/link';
import { 
  PersonalInfoFields, 
  ContactFields, 
  AdditionalInfoFields, 
  PasswordFields, 
  CityField 
} from './registration/RegistrationFormFields';
import { validateForm, prepareRegistrationData } from './registration/RegistrationValidation';
import 'react-phone-number-input/style.css';

interface FormData {
  phone: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  gender: 'M' | 'F' | 'O' | '';
  city: string;
  password: string;
  confirmPassword: string;
}

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
export default function ClientRegistrationForm() {
  const [formData, setFormData] = useState<FormData>({
    phone: '',
    firstName: '',
    lastName: '',
    email: '',
    birthDate: '',
    gender: '',
    city: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useClientAuth();
  const router = useRouter();

  // ✅ FUNÇÃO: Validar formulário (Complexidade: 3)
  const validateFormLocal = (): string | null => {
    const validation = validateForm(formData);
    if (!validation.isValid) { // +1
      return validation.errors[0]; // Retorna o primeiro erro
    }
    
    // Validação adicional do telemóvel
    const cleanPhone = formData.phone.replace(/\s+/g, '');
    const phoneRegex = /^(\+351|351)?[1-9][0-9]{8}$/;
    if (!phoneRegex.test(cleanPhone)) { // +1
      return 'Número de telemóvel inválido (ex: +351912345678)';
    }
    
    return null;
  };

  // ✅ FUNÇÃO: Handle input change (Complexidade: 1)
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ FUNÇÃO: Handle phone change (Complexidade: 1)
  const handlePhoneChange = (value: string | undefined) => {
    setFormData(prev => ({ ...prev, phone: value || '' }));
  };

  // ✅ FUNÇÃO: Handle submit (Complexidade: 4)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateFormLocal();
    if (validationError) { // +1
      setError(validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/client/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formData.phone,
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email || null,
          birth_date: formData.birthDate || null,
          gender: formData.gender || null,
          city: formData.city,
          password: formData.password,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) { // +1
        login(data.data.accessToken, data.data.refreshToken, data.data.user, data.data.expiresAt);
        toast.success('Conta criada com sucesso!');
        router.push('/user/dashboard');
      } else { // +1
        setError(data.error || 'Erro no registo');
        if (data.code === 'PHONE_EXISTS') { // +1
          toast.error('Este número já está registado');
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Erro de conexão. Tente novamente.');
      toast.error('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center pb-4">
        <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        <CardTitle className="text-2xl font-bold text-slate-800">
          Criar Conta TYCAT
        </CardTitle>
        <CardDescription className="text-slate-600">
          Junte-se à comunidade TYCAT
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Número de Telemóvel *
            </label>
            <div className="phone-input-white">
              <PhoneInput
                international
                defaultCountry="PT"
                value={formData.phone}
                onChange={handlePhoneChange}
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

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                Nome *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="João"
                  className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                Apelido *
              </label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Silva"
                className="h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email (opcional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="joao@exemplo.com"
                className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Birth Date and Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="birthDate" className="text-sm font-medium text-slate-700">
                Data de Nascimento (opcional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => handleInputChange('birthDate', e.target.value)}
                  className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="gender" className="text-sm font-medium text-slate-700">
                Género (opcional)
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleInputChange('gender', e.target.value as 'M' | 'F' | 'O' | '')}
                className="w-full h-12 px-3 border border-slate-200 rounded-md focus:border-emerald-500 focus:ring-emerald-500 bg-white"
                disabled={isLoading}
              >
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="O">Outro</option>
              </select>
            </div>
          </div>

          {/* City */}
          <div className="space-y-2">
            <label htmlFor="city" className="text-sm font-medium text-slate-700">
              Cidade *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 z-10" />
              <CityAutocomplete
                value={formData.city}
                onChange={(value) => handleInputChange('city', value)}
                placeholder="Digite sua cidade..."
                className="pl-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password *
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
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
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                Confirmar Password *
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder="Repetir password"
                  className="pr-10 h-12 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isLoading ? 'A criar conta...' : 'Criar Conta'}
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
            Já tem conta?{' '}
            <Link 
              href="/user/login" 
              className="font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              Fazer login
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
    <style dangerouslySetInnerHTML={{ __html: phoneInputStyles }} />
  </>
  );
}
