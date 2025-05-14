'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Phone, Lock, AlertTriangle, ChevronDown } from 'lucide-react'
import { loginClient, checkClientPhone } from '@/app/cliente/actions'
import { normalizePhoneNumber } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Cores modernizadas - mesmas do login principal
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

// Lista de países
const countries = [
  { code: 'PT', name: 'Portugal', prefix: '+351', flag: '🇵🇹' },
  { code: 'BR', name: 'Brasil', prefix: '+55', flag: '🇧🇷' },
  { code: 'US', name: 'Estados Unidos', prefix: '+1', flag: '🇺🇸' },
  { code: 'ES', name: 'Espanha', prefix: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Itália', prefix: '+39', flag: '🇮🇹' },
  { code: 'FR', name: 'França', prefix: '+33', flag: '🇫🇷' },
  { code: 'UK', name: 'Reino Unido', prefix: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Alemanha', prefix: '+49', flag: '🇩🇪' },
  { code: 'CV', name: 'Cabo Verde', prefix: '+238', flag: '🇨🇻' },
  { code: 'AO', name: 'Angola', prefix: '+244', flag: '🇦🇴' },
  { code: 'MZ', name: 'Moçambique', prefix: '+258', flag: '🇲🇿' },
];

export default function ClientLoginForm() {
  const [phoneValue, setPhoneValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [isFormLoaded, setIsFormLoaded] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState(countries[0]) // Portugal como padrão
  
  // Efeito para animar a entrada do formulário
  useEffect(() => {
    setIsFormLoaded(true)
  }, [])
  
  // Função para unir prefixo e número de telefone
  const getFullPhoneNumber = () => {
    // Remover qualquer + do prefixo, pois vamos adicionar manualmente
    const prefix = selectedCountry.prefix.replace('+', '')
    // Remover espaços, traços e parênteses do número
    const cleanPhone = phoneValue.replace(/[\s\-()]/g, '')
    
    // Se o telefone já começa com o prefixo, não adicionar novamente
    if (cleanPhone.startsWith(prefix)) {
      return '+' + cleanPhone
    }
    
    // Se começa com 0, remover o 0 inicial
    const phoneWithoutLeadingZero = cleanPhone.startsWith('0') 
      ? cleanPhone.substring(1) 
      : cleanPhone
    
    return '+' + prefix + phoneWithoutLeadingZero
  }
  
  // Verificar se o telefone existe
  const handleCheckPhone = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsChecking(true)
    
    if (!phoneValue || phoneValue.length < 5) {
      setError('Digite um número de telefone válido')
      setIsChecking(false)
      return
    }
    
    // Normalizar telefone antes de enviar, usando o prefixo selecionado
    const fullPhoneNumber = getFullPhoneNumber()
    const normalizedPhone = normalizePhoneNumber(fullPhoneNumber)
    
    // Validar se a normalização funcionou corretamente
    if (!normalizedPhone || normalizedPhone === '+' || normalizedPhone.length < 8) {
      console.error('Falha na normalização do telefone:', { 
        input: fullPhoneNumber, 
        output: normalizedPhone 
      })
      setError('Formato de telefone inválido. Verifique o número digitado.')
      setIsChecking(false)
      return
    }
    
    try {
      console.log('Verificando telefone completo:', fullPhoneNumber)
      console.log('Verificando telefone normalizado:', normalizedPhone)
      const result = await checkClientPhone(normalizedPhone)
      
      if (result.success) {
        if (result.exists) {
          // Se o telefone existe, mostrar formulário de senha
          setShowPasswordForm(true)
        } else {
          // Se o telefone não existe, encaminhar para registro
          setError('Telefone não cadastrado. Por favor, registre-se.')
        }
      } else {
        setError(result.error || 'Erro ao verificar telefone')
      }
    } catch (error) {
      console.error('Erro ao verificar telefone:', error)
      setError('Erro ao verificar telefone')
    } finally {
      setIsChecking(false)
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!password) {
      setError('Digite sua senha')
      return
    }
    
    // Normalizar telefone
    const fullPhoneNumber = getFullPhoneNumber()
    const normalizedPhone = normalizePhoneNumber(fullPhoneNumber)
    
    // Validar se a normalização funcionou corretamente
    if (!normalizedPhone || normalizedPhone === '+' || normalizedPhone.length < 8) {
      console.error('Falha na normalização do telefone para login:', { 
        input: fullPhoneNumber, 
        output: normalizedPhone 
      })
      setError('Formato de telefone inválido. Tente novamente.')
      return
    }
    
    console.log('Login com telefone normalizado:', normalizedPhone)
    
    // Usar o FormData para a server action
    const formData = new FormData()
    formData.append('phone', normalizedPhone)
    formData.append('password', password)
    
    // Chamar a action diretamente com FormData
    try {
      const result = await loginClient(formData)
      
      if (!result.success) {
        setError(result.error || 'Credenciais inválidas')
      }
      // Em caso de sucesso, a server action irá redirecionar
    } catch (error) {
      setError('Erro ao realizar login')
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
        // Formulário para verificar telefone
        <form onSubmit={handleCheckPhone} className="space-y-6">
          <div>
            <Label htmlFor="phone" className={`block text-sm font-medium ${colors.textPrimary}`}>
              Telefone
            </Label>
            <div className="mt-1 relative flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-shrink-0 w-[120px] justify-between">
                    {selectedCountry.flag} 
                    <span className="ml-1">{selectedCountry.prefix}</span>
                    <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-60 overflow-y-auto">
                  {countries.map((country) => (
                    <DropdownMenuItem key={country.code} onSelect={() => setSelectedCountry(country)}>
                      {country.flag} {country.name} ({country.prefix})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="relative flex-1">
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phoneValue}
                  onChange={(e) => setPhoneValue(e.target.value)}
                  className={`pl-3 bg-white/70 border-gray-200 text-gray-900 rounded-md focus:ring-1 focus:ring-lime-500 focus:border-lime-500`}
                  placeholder="Número de telefone"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <Button 
              type="submit" 
              disabled={isChecking}
              className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`}
            >
              {isChecking ? 'Verificando...' : 'Continuar'}
            </Button>
          </div>
        </form>
      ) : (
        // Formulário de login com senha
        <motion.form 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          onSubmit={handleLogin} 
          className="space-y-6"
        >
          <div>
            <Label htmlFor="password" className={`block text-sm font-medium ${colors.textPrimary}`}>
              Senha
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
              className={`${colors.bgAccentLime} text-white w-full font-semibold shadow-md`}
            >
              Entrar
            </Button>
          </div>
          
          <div className="text-center">
            <button 
              type="button" 
              onClick={() => setShowPasswordForm(false)}
              className={`text-sm ${colors.accentMagenta} font-medium hover:underline mt-2`}
            >
              Voltar para telefone
            </button>
          </div>
        </motion.form>
      )}
    </motion.div>
  )
} 