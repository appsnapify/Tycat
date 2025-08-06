'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, Lock, User, Mail, Calendar, MapPin } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/lib/database.types';
import QRCodeDisplay from './QRCodeDisplay';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

// Estilos para forçar fundo branco no PhoneInput
const phoneInputStyles = `
  .phone-input-white input {
    background-color: white !important;
    color: black !important;
  }
  .phone-input-white input:focus {
    background-color: white !important;
    color: black !important;
  }
  .phone-input-white input:hover {
    background-color: white !important;
  }
  .phone-input-white input:active {
    background-color: white !important;
  }
  .phone-input-white .PhoneInputInput {
    background-color: white !important;
    color: black !important;
  }
`;

interface GuestRegistrationFormProps {
  eventId: string;
  promoterId: string | null; // Opcional para organizações
  eventTitle: string;
  teamId?: string | null; // Para organizações
  onShowQRCode?: (showing: boolean) => void; // Callback para informar quando QR Code é mostrado
}

type FormStep = 'phone' | 'login' | 'register' | 'success';

interface ClientUser {
  id: string;
  phone: string;
  first_name: string;
  last_name: string;
  email: string | null;
  birth_date?: string | null;
  gender?: string;
  postal_code?: string | null;
  city?: string | null;
}

interface GuestResult {
  success: boolean;
  guest_id?: string;
  client_id?: string;
  qr_code?: string;
  message?: string;
  error?: string;
}

export default function GuestRegistrationForm({ eventId, promoterId, eventTitle, teamId, onShowQRCode }: GuestRegistrationFormProps) {
  const [step, setStep] = useState<FormStep>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [postalCodeLoading, setPostalCodeLoading] = useState(false);
  
  // Results
  const [clientUser, setClientUser] = useState<ClientUser | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  // 🇵🇹 Auto-detect city from postal code
  const handlePostalCodeChange = async (value: string) => {
    setPostalCode(value);
    
    // Só buscar se tiver pelo menos 4 caracteres
    if (value.length >= 4) {
      setPostalCodeLoading(true);
      try {
        const response = await fetch(`/api/postal-code?code=${encodeURIComponent(value)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.city) {
            setCity(data.city);
          }
        }
      } catch (error) {
        console.error('Postal code lookup error:', error);
      } finally {
        setPostalCodeLoading(false);
      }
    }
  };

  const supabase = createClientComponentClient<Database>();

  // Validate phone number (now handled by react-phone-number-input)
  const validatePhone = (phoneNumber: string): string | null => {
    console.log('📞 validatePhone - input:', phoneNumber);
    if (!phoneNumber || phoneNumber.length < 8) {
      return null;
    }
    return phoneNumber;
  };

  // Step 1: Check if phone exists
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // console.log('📞 handlePhoneSubmit - phone value:', phone);
      
      if (!phone || phone.length < 8) {
        setError('Número de telemóvel inválido');
        setLoading(false);
        return;
      }

      // 🛡️ SISTEMA GUEST ISOLADO - Usar API segura (resolve erro 406)
      const response = await fetch('/api/guest/verify-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na verificação do telefone');
      }

      const phoneResult = await response.json();

      if (phoneResult.exists && phoneResult.user) {
        // Cliente existe -> Pedir login
        setClientUser({
          id: phoneResult.user.id,
          phone: phoneResult.phone, // Use the normalized phone from API response
          first_name: phoneResult.user.firstName,
          last_name: phoneResult.user.lastName,
          email: phoneResult.user.email
        });
        setStep('login');
      } else {
        // Cliente não existe -> Pedir registo
        setStep('register');
      }
    } catch (err: any) {
      setError('Erro ao verificar número. Tenta novamente.');
      console.error('Phone check error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Login existing client
  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 🔧 FIX: Usar o telefone normalizado do cliente encontrado
      const phoneToUse = clientUser?.phone || phone;
      
      // 🚨 SISTEMA GUEST ISOLADO - Usar API específica para guests
      const response = await fetch('/api/guest/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneToUse,
          password,
          eventId,
          promoterId,
          teamId
        }),
      });

      const result: GuestResult = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Credenciais incorretas');
        return;
      }

      // Sucesso - mostrar QR code
      setQrCode(result.qr_code || null);
      setStep('success');

    } catch (err: any) {
      setError('Erro no login. Tenta novamente.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Register new client
  const handleClientRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validação de campos obrigatórios (incluindo email)
      if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
        setError('Preenche todos os campos obrigatórios (incluindo email)');
        return;
      }

      // Validação de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setError('Email inválido');
        return;
      }

      // Validação de password
      if (password.length < 8) {
        setError('Password deve ter pelo menos 8 caracteres');
        return;
      }

      // Validação de complexidade detalhada
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      
      if (!hasLower || !hasUpper || !hasNumber) {
        const missing = [];
        if (!hasLower) missing.push('minúscula');
        if (!hasUpper) missing.push('maiúscula');
        if (!hasNumber) missing.push('número');
        setError(`Password deve ter: ${missing.join(', ')}`);
        return;
      }

      // Validação de confirmação de password
      if (password !== confirmPassword) {
        setError('As passwords não coincidem');
        return;
      }

      // 🔍 DEBUG: Log dos dados antes de enviar
      console.log('=== FRONTEND REGISTER DEBUG ===');
      console.log('phone:', phone);
      console.log('firstName:', firstName.trim());
      console.log('lastName:', lastName.trim());
      console.log('email:', email.trim());
      console.log('password length:', password?.length);
      console.log('eventId:', eventId);
      console.log('promoterId:', promoterId);
      console.log('===============================');

      // 🚨 SISTEMA GUEST ISOLADO - Usar API específica para guests
      const response = await fetch('/api/guest/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(), // Email sempre string (obrigatório)
          birthDate: birthDate || null,
          gender,
          postalCode: postalCode.trim() || null,
          city: city.trim() || null,
          password,
          eventId,
          promoterId,
          teamId
        }),
      });

      const result: GuestResult = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Erro no registo');
        return;
      }

      // Sucesso - mostrar QR code
      setQrCode(result.qr_code || null);
      setStep('success');

    } catch (err: any) {
      setError('Erro no registo. Tenta novamente.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStep('phone');
    setPhone('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setBirthDate('');
    setGender('M');
    setClientUser(null);
    setQrCode(null);
    setError(null);
    onShowQRCode?.(false);
  };

  // Notificar quando QR Code é mostrado/escondido
  useEffect(() => {
    onShowQRCode?.(step === 'success' && !!qrCode);
  }, [step, qrCode, onShowQRCode]);

  // Render based on current step
  if (step === 'success' && qrCode) {
    return (
      <QRCodeDisplay 
        qrCode={qrCode}
        eventTitle={eventTitle}
        guestName={clientUser ? `${clientUser.first_name} ${clientUser.last_name}` : `${firstName} ${lastName}`}
        onReset={resetForm}
      />
    );
  }

  return (
    <div className="space-y-4">
      <style jsx global>{`
        .PhoneInput {
          display: flex;
          width: 100%;
        }
        
        .PhoneInputCountry {
          background: white !important;
          border: none !important;
          border-radius: 0.375rem 0 0 0.375rem;
          border-right: none;
          padding: 0.5rem;
          display: flex;
          align-items: center;
        }
        
        .PhoneInputCountrySelect {
          background: transparent;
          border: none;
          color: black !important;
          font-size: 0.875rem;
        }
        
        .PhoneInputCountrySelect:focus {
          outline: none;
          background: transparent !important;
          color: black !important;
        }
        
        .PhoneInputCountryIcon {
          margin-right: 0.5rem;
          border-radius: 2px;
          width: 1.25rem;
          height: auto;
        }
        
        .PhoneInputInput {
          background: white !important;
          border: none !important;
          border-radius: 0;
          color: black !important;
          padding: 0.5rem 0.75rem;
          flex: 1;
          font-size: 0.875rem;
        }
        
        .PhoneInputInput::placeholder {
          color: rgb(156, 163, 175);
        }
        
        .PhoneInputInput:focus {
          outline: none;
          background: white !important;
          color: black !important;
          border: none !important;
        }
        
        .PhoneInputInput:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Phone Input Simplificado */}
      {step === 'phone' && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg mb-3">
              <Phone className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Número de Telemóvel</h3>
            <p className="text-slate-500 text-sm">Para verificação e acesso</p>
          </div>
          
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="max-w-sm mx-auto">
              <div className="bg-white border-2 border-emerald-500 rounded-xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200 shadow-sm">
                <PhoneInput
                  international
                  countryCallingCodeEditable={false}
                  defaultCountry="PT"
                  value={phone}
                  onChange={(value) => {
                    // console.log('🌍 PhoneInput onChange:', value);
                    setPhone(value || '');
                  }}
                  disabled={loading}
                  placeholder="93 588 6310"
                  className="phone-input-white"
                  style={{
                    width: '100%',
                    '--PhoneInputCountrySelectArrow-color': '#059669',
                    '--PhoneInputCountrySelect-marginRight': '0.5rem',
                    '--PhoneInput-color--focus': '#000000',
                    '--PhoneInput-color': '#000000',
                    backgroundColor: 'white !important',
                  }}
                />
              </div>
            </div>
            
            <div className="max-w-sm mx-auto">
            <Button 
              type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-medium transition-colors"
              disabled={loading}
            >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verificando...</span>
                  </div>
                ) : (
                  'Continuar'
                )}
            </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2A: Login Form Simplificado */}
      {step === 'login' && clientUser && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg mb-3">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              Olá {clientUser.first_name}!
            </h3>
            <p className="text-slate-500 text-sm">Introduz a tua palavra-passe</p>
          </div>

          <form onSubmit={handleClientLogin} className="space-y-4">
            <div className="max-w-sm mx-auto space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                Palavra-passe
              </Label>
              <div className="relative">
                <div className="bg-transparent border-2 border-emerald-500 rounded-xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
                  <div className="relative">
                    <Lock className="absolute left-0 top-1/2 transform -translate-y-1/2 h-4 w-4 text-emerald-600" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                      className="pl-6 border-none bg-transparent focus:ring-0 focus:border-none text-slate-800 placeholder-slate-400"
                  required
                  disabled={loading}
                />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="max-w-sm mx-auto space-y-3">
            <Button 
              type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-medium transition-colors"
              disabled={loading}
            >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Entrando...</span>
                  </div>
                ) : (
                  'Entrar'
                )}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
                className="w-full text-slate-500 hover:text-emerald-600 text-sm py-2"
              onClick={() => setStep('phone')}
              disabled={loading}
            >
              ← Voltar
            </Button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2B: Registration Form Simplificado */}
      {step === 'register' && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-emerald-100 rounded-lg mb-3">
              <User className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">Criar Conta</h3>
            <p className="text-slate-500 text-sm">Só precisamos de alguns dados</p>
          </div>

          <form onSubmit={handleClientRegister} className="space-y-4">
            <div className="max-w-sm mx-auto space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="bg-transparent border-2 border-emerald-500 rounded-xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                      className="border-none bg-transparent focus:ring-0 focus:border-none text-slate-800 placeholder-slate-400 text-sm"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              
                <div>
                  <div className="bg-transparent border-2 border-emerald-500 rounded-xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Apelido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                      className="border-none bg-transparent focus:ring-0 focus:border-none text-slate-800 placeholder-slate-400 text-sm"
                  required
                  disabled={loading}
                />
                  </div>
              </div>
            </div>

              <div className="bg-transparent border-2 border-emerald-500 rounded-xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all duration-200">
                <Input
                  id="email"
                  type="email"
                  placeholder="Email (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-none bg-transparent focus:ring-0 focus:border-none text-slate-800 placeholder-slate-400 text-sm"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="max-w-sm mx-auto space-y-3">
            <Button 
              type="submit" 
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-medium transition-colors"
              disabled={loading}
            >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Criando conta...</span>
                  </div>
                ) : (
                  'Criar Conta'
                )}
            </Button>
            
            <Button 
              type="button" 
              variant="ghost" 
                className="w-full text-slate-500 hover:text-emerald-600 text-sm py-2"
              onClick={() => setStep('phone')}
              disabled={loading}
            >
              ← Voltar
            </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}