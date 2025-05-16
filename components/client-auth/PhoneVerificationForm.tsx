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

  const verifyPhone = async (normalizedPhone: string): Promise<{exists: boolean, userId: string | null} | null> => {
    console.log('Verificando telefone:', normalizedPhone);
    
    // SOLUÇÃO: Não reutilizar controllerRef.current, criar um novo controller para esta requisição específica
    const controller = new AbortController();
    
    try {
      console.log('Iniciando fetch de verificação de telefone');
      
      const response = await fetch('/api/client-auth-v2/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: normalizedPhone }),
        signal: controller.signal
      });
      
      console.log('Resposta recebida da API de verificação:', response.status);
      
      if (!response.ok) {
        // Tentar obter detalhes do erro do corpo da resposta
        try {
          const errorData = await response.json();
          console.error('Erro de verificação:', errorData);
          throw new Error(errorData.error || translations['Por favor, insira um número de telemóvel válido']);
        } catch (e) {
          // Se não conseguir processar o JSON, use a informação de status
          throw new Error(`Erro de verificação (${response.status}): ${response.statusText}`);
        }
      }
      
      // Tratar possíveis erros no parse do JSON
      let data;
      try {
        const responseText = await response.text();
        console.log('Resposta em texto:', responseText.substring(0, 100));
        
        // Verificar se a resposta não está vazia
        if (!responseText || responseText.trim() === '') {
          throw new Error('Resposta vazia do servidor');
        }
        
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Erro ao parsear JSON:', jsonError);
        throw new Error('Erro ao processar resposta do servidor');
      }
      
      console.log('Resposta da verificação de telefone:', data);
      console.log('Verificando userId retornado:', data.userId || 'não encontrado');
      
      // Garantir que exists seja um booleano válido
      if (typeof data.exists !== 'boolean') {
        console.warn('Resposta da API com formato inválido (exists não é boolean):', data);
        // Converter para booleano explicitamente
        data.exists = !!data.exists;
      }
      
      return {
        exists: data.exists,
        userId: data.userId || null
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
          data = await verifyPhone(phone);
          
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
    <Card className="border-0 shadow-none auth-dialog">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold">Acesso à Guest List</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Introduz o teu número de telemóvel para continuar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              {translations['Telefone']}
            </label>
            <PhoneInput
              international={false}
              countryCallingCodeEditable={false}
              defaultCountry="PT"
              flags={flags}
              value={phone}
              onChange={handlePhoneChange}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            {error && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-destructive">{error}</p>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRetry}
                  className="h-6 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span className="text-xs">{translations['Tentar novamente']}</span>
                </Button>
              </div>
            )}
            {!error && phone && !isPhoneValid && (
              <p className="text-xs text-amber-500">{translations['Formato de número incompleto ou inválido']}</p>
            )}
            {!error && isPhoneValid && (
              <p className="text-xs text-green-500">{translations['Formato de número válido!']}</p>
            )}
          </div>
          
          {isSubmitting && (
            <div className="space-y-1 my-2">
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {statusMessage}
                </p>
                {retryCount > 0 && (
                  <span className="text-xs text-amber-500">Tentativa {retryCount}</span>
                )}
              </div>
            </div>
          )}
          
          <div className="pt-4 pb-2 button-container">
          <Button 
            type="submit" 
            className="w-full text-white font-medium"
            disabled={isSubmitting || !phone || !isPhoneValid}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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