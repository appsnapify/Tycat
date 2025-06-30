'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, Lock, AlertTriangle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import PhoneInput from 'react-phone-number-input'
import { isValidPhoneNumber } from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
import { Progress } from '@/components/ui/progress'
import { useRouter } from 'next/navigation'

const colors = {
  textPrimary: 'text-gray-800',
  textSecondary: 'text-gray-500',
  accentLime: 'text-lime-600',
  accentMagenta: 'text-fuchsia-600',
  bgAccentLime: 'bg-lime-500',
  bgAccentMagenta: 'bg-fuchsia-500',
  borderLime: 'border-lime-400',
  borderFuchsia: 'border-fuchsia-200',
}

const translations = {
  'Formato de telefone inválido': 'Formato de telemóvel inválido',
  'Digite um número de telefone válido': 'Digite um número de telemóvel válido',
  'Telefone não cadastrado': 'Telemóvel não registado',
  'Iniciando verificação...': 'A iniciar verificação...',
  'Verificando número...': 'A verificar número...',
  'Quase pronto...': 'Quase concluído...',
  'Verificação concluída!': 'Verificação concluída!',
  'Continuar': 'Continuar',
  'Verificando...': 'A verificar...',
  'Entrar': 'Entrar',
  'Telefone': 'Telemóvel',
  'Número de telefone': 'Número de telemóvel',
  'Senha': 'Palavra-passe',
  'Voltar para telefone': 'Voltar para telemóvel'
};

export default function ClientLoginFormReal() {
  const [phoneValue, setPhoneValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isFormLoaded, setIsFormLoaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  const router = useRouter()
  
  useEffect(() => {
    setIsFormLoaded(true)
  }, [])
  
  const getFullPhoneNumber = () => {
    if (phoneValue.startsWith('+')) {
      return phoneValue;
    }
    
    const cleanPhone = phoneValue.replace(/[\s\-()]/g, '');
    
    if (cleanPhone.startsWith('351')) {
      return '+' + cleanPhone;
    }
    
    if (/^9\d{8}$/.test(cleanPhone)) {
      return '+351' + cleanPhone;
    }
    
    return '+351' + cleanPhone;
  }
  
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsChecking(true)
    setProgress(10)
    setStatusMessage(translations['Iniciando verificação...'])
    
    if (!phoneValue || phoneValue.length < 5) {
      setError(translations['Digite um número de telefone válido'])
      setIsChecking(false)
      setProgress(0)
      return
    }
    
    const fullPhoneNumber = getFullPhoneNumber()
    
    if (!isValidPhoneNumber(fullPhoneNumber)) {
      setError(translations['Formato de telefone inválido'])
      setIsChecking(false)
      setProgress(0)
      return
    }
    
    setProgress(40)
    setStatusMessage(translations['Verificando número...'])
    
    try {
      const response = await fetch('/api/client-auth-v2/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: fullPhoneNumber }),
      });
      
      if (!response.ok) {
        throw new Error('Erro na verificação do telefone');
      }
      
      const result = await response.json();
      
      setProgress(70)
      setStatusMessage(translations['Quase pronto...'])
      
      setTimeout(() => {
        setProgress(100)
        setStatusMessage(translations['Verificação concluída!'])
        
        if (result.exists) {
          setUserId(result.userId)
          setShowPasswordForm(true)
        } else {
          setError('Telemóvel não registado. Por favor, registe-se primeiro.')
        }
        
        setTimeout(() => {
          setIsChecking(false)
        }, 500)
      }, 300)
      
    } catch (error) {
      console.error('Erro na verificação:', error)
      setError('Erro ao verificar o telefone. Tente novamente.')
      setIsChecking(false)
      setProgress(0)
      setStatusMessage('')
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoggingIn(true)
    
    if (!password) {
      setError('Digite sua palavra-passe')
      setIsLoggingIn(false)
      return
    }
    
    try {
      const fullPhoneNumber = getFullPhoneNumber()
      
      let response;
      let requestBody;
      let endpoint = '';
      
      if (userId) {
        requestBody = {
          userId,
          password: password
        };
        endpoint = '/api/client-auth/direct-login';
      } else {
        requestBody = {
          phone: fullPhoneNumber,
          password: password
        };
        endpoint = '/api/client-auth/login';
      }
      
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao iniciar sessão');
      }
      
      // Login bem-sucedido - criar sessão client-side
      console.log('Login bem-sucedido:', result.user);
      
      // Salvar dados do usuário e redirecionar
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_user', JSON.stringify(result.user));
      }
      
      router.push('/user/dashboard');
      
    } catch (error) {
      console.error('Erro no login:', error)
      setError(error instanceof Error ? error.message : 'Erro ao processar login. Tente novamente.')
      setIsLoggingIn(false)
    }
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isFormLoaded ? 1 : 0, y: isFormLoaded ? 0 : 20 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {error && (
        <Alert variant="destructive" className="mt-4 border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {!showPasswordForm ? (
        <form onSubmit={handleCheckPhone} className="space-y-6">
          <div>
            <Label htmlFor="phone" className={`block text-sm font-medium ${colors.textPrimary}`}>
              {translations['Telefone']}
            </Label>
            <div className="mt-1 relative">
              <PhoneInput
                international={false}
                value={phoneValue}
                onChange={(value) => {
                  setPhoneValue(value || '');
                }}
                defaultCountry="PT"
                className="w-full rounded-md bg-white/70 border-gray-200 text-gray-900 focus:ring-1 focus:ring-lime-500 focus:border-lime-500"
                placeholder={translations['Número de telefone']}
              />
            </div>
            
            {isChecking && (
              <div className="mt-3">
                <Progress value={progress} className="h-1 mb-1" />
                <p className="text-xs text-muted-foreground">{statusMessage}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center">
            <Button 
              type="submit" 
              disabled={isChecking}
              className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`}
            >
              {isChecking ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {translations['Verificando...']}
                </div>
              ) : (
                translations['Continuar']
              )}
            </Button>
          </div>
        </form>
      ) : (
        <motion.form 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleLogin} 
          className="space-y-6"
        >
          <div>
            <Label htmlFor="password" className={`block text-sm font-medium ${colors.textPrimary}`}>
              {translations['Senha']}
            </Label>
            <div className="mt-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className={`h-5 w-5 text-fuchsia-500`} />
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`pl-10 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-fuchsia-500 focus:border-fuchsia-500`}
                placeholder="••••••••"
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Button 
              type="submit"
              disabled={isLoggingIn}
              className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`}
            >
              {isLoggingIn ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A entrar...
                </div>
              ) : (
                translations['Entrar']
              )}
            </Button>
          </div>
          
          <div className="text-center">
            <button 
              type="button" 
              onClick={() => setShowPasswordForm(false)}
              className={`text-sm ${colors.accentMagenta} font-medium hover:underline mt-2`}
            >
              {translations['Voltar para telefone']}
            </button>
          </div>
        </motion.form>
      )}
    </motion.div>
  )
}
