'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { isValidPhoneNumber } from 'react-phone-number-input'

interface PhoneVerificationFormProps {
  onVerified: (phone: string, exists: boolean, userId?: string | null) => void
  defaultPhone?: string
}

// Traduções em português para melhor localização
const translations = {
  'Telefone': 'Telemóvel',
  'Por favor, insira um número de telemóvel': 'Por favor, introduz um número de telemóvel',
  'Por favor, insira um número de telemóvel válido': 'Por favor, introduz um número de telemóvel válido',
  'Formato de número incompleto ou inválido': 'Formato de número incompleto ou inválido',
  'Formato de número válido!': 'Formato de número válido!',
  'A iniciar verificação...': 'A iniciar verificação...',
  'A contactar o servidor...': 'A contactar o servidor...',
  'A verificar número...': 'A verificar número...',
  'Quase concluído...': 'Quase concluído...',
  'Verificação concluída!': 'Verificação concluída!',
  'A verificar...': 'A verificar...',
  'Tentar novamente': 'Tentar novamente',
  'Continuar': 'Continuar',
  'A verificação foi cancelada. Por favor, tente novamente.': 'A verificação foi cancelada. Por favor, tenta novamente.',
  'Problema de conexão. Verifique sua internet e tente novamente.': 'Problema de conexão. Verifica a tua internet e tenta novamente.',
  'A verificação demorou muito tempo. Por favor, tente novamente.': 'A verificação demorou muito tempo. Por favor, tenta novamente.'
};

export function PhoneVerificationForm({ onVerified, defaultPhone = '' }: PhoneVerificationFormProps) {
  const [phone, setPhone] = useState<string>(defaultPhone)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  
  // Inicializar o telefone a partir da prop padrão se fornecida
  useEffect(() => {
    if (defaultPhone && !phone) {
      setPhone(defaultPhone);
    }
  }, [defaultPhone]);

  // Limpar timeout ao desmontar componente
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [])

  // Validação do telefone em tempo real
  const isPhoneValid = phone && isValidPhoneNumber(phone)

  const verifyPhone = async (): Promise<{exists: boolean, userId: string | null} | null> => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Usar o telefone diretamente (já vem formatado do react-phone-number-input)
      const phoneToVerify = phone;
      
      const response = await fetch('/api/client-auth-v3/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneToVerify }),
      });
      
      if (!response.ok) {
          const errorData = await response.json();
        throw new Error(errorData.error || `Erro na verificação: ${response.status}`);
      }

      let responseData;
      try {
        const responseText = await response.text();
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta JSON:', parseError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      // Garantir que exists seja um booleano válido
      if (typeof responseData.exists !== 'boolean') {
        console.warn('Resposta da API com formato inválido (exists não é boolean):', responseData);
        // Converter para booleano explicitamente
        responseData.exists = !!responseData.exists;
      }
      
      return {
        exists: responseData.exists,
        userId: responseData.userId || null
      };
    } catch (error) {
      // Não registrar o erro se foi um abort deliberado
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Erro ao verificar telemóvel:', error);
      }
      throw error;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validar o telefone antes de enviar
    if (!phone) {
      setError('Por favor, insira um número de telemóvel')
      return
    }
    
    if (!isPhoneValid) {
      setError('Por favor, insira um número de telemóvel válido')
      return
    }
    
    // Se já está em processo de submissão, não fazer nada
    if (isSubmitting) return
    
    // Limpar qualquer verificação anterior em andamento
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    
    setIsSubmitting(true)
    setProgress(10)
    setStatusMessage('A iniciar verificação...')
    
    // Simular progresso durante a verificação para feedback visual
    const startProgressSimulation = () => {
      setProgress(25)
      setStatusMessage('A contactar o servidor...')
      
      timeoutRef.current = setTimeout(() => {
        setProgress(50)
        setStatusMessage('A verificar número...')
        
        timeoutRef.current = setTimeout(() => {
          setProgress(75)
          setStatusMessage('Quase concluído...')
        }, 500)
      }, 300)
    }
    
    startProgressSimulation()
    
    // Número máximo de tentativas
    const MAX_RETRIES = 2
    let currentTry = 0
    
    // Evitando usar Promise.race que pode causar AbortError
    // Em vez disso, usaremos apenas um timeout padrão no fetch
    const attemptVerification = async (): Promise<void> => {
      currentTry++
      
      try {
        // Tentar verificar o telefone diretamente, sem Promise.race
        let data;
        try {
          // Inicializar um novo AbortController para cada tentativa
          if (controllerRef.current) {
            controllerRef.current.abort(); // Abortar qualquer requisição anterior
          }
          controllerRef.current = new AbortController();
          
          // Definir um timeout que vai abortar a requisição se demorar muito
          const timeoutId = setTimeout(() => {
            if (controllerRef.current) {
              console.log('Timeout atingido, abortando requisição');
              controllerRef.current.abort();
            }
          }, 10000); // 10 segundos
          
          // Chamar a função de verificação
          data = await verifyPhone();
          
          // Limpar o timeout se a requisição completou
          clearTimeout(timeoutId);
        } catch (verifyError) {
          console.error(`Erro na tentativa ${currentTry} de verificar telefone:`, verifyError);
          throw verifyError; // Re-throw para ser tratado pelo bloco catch externo
        }
        
        if (!data) {
          throw new Error('Sem resposta do servidor');
        }
        
        setProgress(100);
        setStatusMessage('Verificação concluída!');
        
        // Ligeiro atraso para mostrar que verificação foi concluída
        setTimeout(() => {
          // Garantir que data.exists seja um booleano válido antes de chamar onVerified
          const exists = data && typeof data.exists === 'boolean' 
            ? data.exists 
            : false; // Default para false em caso de problemas
          
          console.log('Chamando onVerified com:', { phone, exists, userId: data?.userId });
          onVerified(phone, exists, data?.userId);
        }, 300);
      
    } catch (error: any) {
        console.error(`Erro na tentativa ${currentTry}:`, error);
        
        // Melhorar mensagem de erro para o usuário
        let errorMessage = 'Erro na verificação';
        
        if (error instanceof Error) {
          errorMessage = error.message;
          
          // Mensagens mais amigáveis para erros comuns
          if (error.name === 'AbortError') {
            errorMessage = 'A verificação foi cancelada. Por favor, tente novamente.';
          } else if (error.message.includes('fetch') || error.message.includes('network')) {
            errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
          } else if (error.message.includes('timeout') || error.message.includes('expirou')) {
            errorMessage = 'A verificação demorou muito tempo. Por favor, tente novamente.';
          }
        }
        
        // Se ainda temos tentativas, tentar novamente
        if (currentTry <= MAX_RETRIES && !(error instanceof Error && error.name === 'AbortError')) {
          // Tentar novamente, mas apenas se não for um abort deliberado
          setStatusMessage(`Tentativa ${currentTry} falhou. A tentar novamente...`);
          setRetryCount(currentTry);
          
          // Aguardar um tempo crescente entre retentativas (backoff exponencial)
          const retryDelay = Math.min(1000 * Math.pow(2, currentTry - 1), 5000);
          console.log(`Aguardando ${retryDelay}ms antes da próxima tentativa`);
          
          setTimeout(() => {
            attemptVerification();
          }, retryDelay);
        } else {
          // Limpar o timeout global quando desistimos
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          
          // Desistir após tentativas
          setError(errorMessage);
          setProgress(0);
          setStatusMessage('');
          setIsSubmitting(false);
          setRetryCount(0);
        }
      }
    }
    
    attemptVerification()
  }

  // Handler com debounce para mudança de telefone
  const handlePhoneChange = (value: string | undefined) => {
    setPhone(value || '')
    
    // Limpar erros quando o usuário está digitando
    if (error) setError(null)
    
    // Adicionar validação automática com debounce para números completos
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }

  const handleRetry = () => {
    // Limpar qualquer verificação anterior em andamento
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    
    // Limpar todos os timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    setError(null)
    setProgress(0)
    setStatusMessage('')
    setIsSubmitting(false)
    setRetryCount(0)
    
    // Breve timeout antes de tentar novamente
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    }, 500)
  }

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4">
        <CardTitle className="text-center text-lg sm:text-xl">Verificar Telemóvel</CardTitle>
        <CardDescription className="text-center text-xs sm:text-sm">
          Introduz o teu número para continuares
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="space-y-1 sm:space-y-2">
            <label htmlFor="phone" className="text-xs sm:text-sm font-medium">
              Número de telemóvel
            </label>
            <div className="relative">
              <PhoneInput
                placeholder="Introduz o teu número"
                value={phone}
                onChange={handlePhoneChange}
                flags={flags}
                defaultCountry="PT"
                international={false}
                countryCallingCodeEditable={false}
                className="w-full"
                style={{
                  '--PhoneInput-color--focus': '#2563eb',
                  '--PhoneInput-background': 'transparent'
                } as React.CSSProperties}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Validação em tempo real */}
            {phone && (
              <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                {isPhoneValid ? (
                  <>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">{translations['Formato de número válido!']}</span>
                  </>
                ) : (
                  <>
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-orange-600">{translations['Formato de número incompleto ou inválido']}</span>
                  </>
                )}
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                <span className="text-xs text-red-600">{error}</span>
              </div>
            )}
          </div>
          
          {/* Progress bar durante a verificação */}
          {isSubmitting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-1.5 sm:h-2" />
              <p className="text-xs text-center text-muted-foreground">{statusMessage}</p>
            </div>
          )}
          
          <div className="pt-2 sm:pt-4">
            {retryCount > 0 && !isSubmitting && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleRetry}
                className="w-full mb-2 text-xs sm:text-sm"
              >
                <RefreshCw className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                {translations['Tentar novamente']}
              </Button>
            )}
            
            <Button 
              type="submit" 
              disabled={!isPhoneValid || isSubmitting}
              className="w-full text-xs sm:text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  {translations['A verificar...']}
                </>
              ) : (
                translations['Continuar']
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 