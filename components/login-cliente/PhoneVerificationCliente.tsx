'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import PhoneInput from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import 'react-phone-number-input/style.css'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { isValidPhoneNumber } from 'react-phone-number-input'
import type { PhoneCheckResponse } from './types'

interface PhoneVerificationClienteProps {
  onVerified: (phone: string, exists: boolean, userId?: string | null) => void
  defaultPhone?: string
}

export function PhoneVerificationCliente({ onVerified, defaultPhone = '' }: PhoneVerificationClienteProps) {
  const [phone, setPhone] = useState<string>(defaultPhone)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
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
      
      const response = await fetch('/api/login-cliente/check-phone', {
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

      let responseData: PhoneCheckResponse;
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
    
    const attemptVerification = async (): Promise<void> => {
      currentTry++
      
      try {
        let data;
        try {
          // Inicializar um novo AbortController para cada tentativa
          if (controllerRef.current) {
            controllerRef.current.abort();
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
          throw verifyError;
        }
        
        if (!data) {
          throw new Error('Dados de verificação não recebidos');
        }
        
        // Finalizar progresso
        setProgress(100);
        setStatusMessage('Verificação concluída!');
        
        // Chamar callback com resultado
        setTimeout(() => {
          onVerified(phone, data.exists, data.userId);
          setIsSubmitting(false);
          setProgress(0);
          setStatusMessage('');
        }, 500);
        
      } catch (error: any) {
        console.error(`Tentativa ${currentTry} falhou:`, error);
        
        if (currentTry < MAX_RETRIES && error.name !== 'AbortError') {
          console.log(`Tentando novamente... (${currentTry}/${MAX_RETRIES})`);
          setRetryCount(currentTry);
          
          // Aguardar antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000 * currentTry));
          return attemptVerification();
        } else {
          // Falha definitiva
          setError(error.message || 'Erro desconhecido na verificação');
          setIsSubmitting(false);
          setProgress(0);
          setStatusMessage('');
        }
      }
    };
    
    await attemptVerification();
  }

  const handleRetry = () => {
    setError(null);
    setRetryCount(0);
    setProgress(0);
    setStatusMessage('');
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Verificar Telemóvel</CardTitle>
        <CardDescription className="text-sm">
          Introduz o teu número para continuares
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-700 text-sm">{error}</p>
              {retryCount > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={handleRetry}
                >
                  Tentar novamente
                </Button>
              )}
            </div>
          )}
          
          <div className="space-y-2">
            <PhoneInput
              international
              countryCallingCodeEditable={false}
              defaultCountry="PT"
              value={phone}
              onChange={(value) => setPhone(value || '')}
              className="w-full"
              flags={flags}
              placeholder="Número de telemóvel"
              disabled={isSubmitting}
            />
            
            {phone && !isPhoneValid && (
              <p className="text-amber-600 text-sm">
                Formato de número incompleto ou inválido
              </p>
            )}
            
            {phone && isPhoneValid && (
              <p className="text-green-600 text-sm">
                ✓ Formato de número válido!
              </p>
            )}
          </div>
          
          {isSubmitting && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {statusMessage}
              </p>
              {retryCount > 0 && (
                <p className="text-center text-xs text-muted-foreground">
                  Tentativa {retryCount + 1}/3
                </p>
              )}
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={!isPhoneValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                A verificar...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 