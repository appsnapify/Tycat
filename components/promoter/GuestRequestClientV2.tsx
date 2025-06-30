'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Phone, Clock, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Image from 'next/image';
import { ClientUser } from '@/types/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerificationForm } from '@/components/client-auth/PhoneVerificationForm';
import ClientLoginForm from '@/components/client-auth/ClientLoginForm';
import ClientRegistrationForm from '@/components/client-auth/ClientRegistrationForm';
import { ProgressSteps } from '@/components/ui/progress-steps';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface GuestRequestProps {
  eventId: string;
  promoterId: string;
  teamId: string;
  className?: string;
  buttonStyle?: React.CSSProperties;
}

export function GuestRequestClientV2({
  eventId,
  promoterId,
  teamId,
  className = '',
  buttonStyle
}: GuestRequestProps) {
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // ✅ NOVOS STATES PARA RESPOSTA IMEDIATA + POLLING
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // States para controle de progresso e feedback
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubmessage, setLoadingSubmessage] = useState('');

  // ✅ POLLING AUTOMÁTICO PARA VERIFICAR STATUS
  useEffect(() => {
    if (!processingKey || !isPolling) return;

    let pollCount = 0;
    const maxPolls = 20; // Máximo 20 tentativas (40 segundos)
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      try {
        const response = await fetch(`/api/client-auth-v3/guests/status/${processingKey}`);
        const result = await response.json();
        
        if (result.success && !result.processing) {
          // ✅ PROCESSAMENTO COMPLETO
          clearInterval(pollInterval);
          setIsPolling(false);
          setProcessingKey(null);
          
          if (result.data?.qr_code_url) {
            setQrCodeUrl(result.data.qr_code_url);
            setShowQRCode(true);
            setCompletedSteps(prev => [...prev, 'qr']);
            toast.success('QR Code criado com sucesso!');
          }
          
          setIsSubmitting(false);
          return;
        }
        
        if (!result.success || result.expired) {
          // ✅ ERRO OU EXPIRADO
          clearInterval(pollInterval);
          setIsPolling(false);
          setProcessingKey(null);
          setIsSubmitting(false);
          
          toast.error(result.error || 'Processamento falhou');
          return;
        }
        
        // ✅ AINDA PROCESSANDO - ATUALIZAR PROGRESSO
        if (result.processing) {
          const progress = Math.min(95, (pollCount / maxPolls) * 100);
          setProcessingProgress(progress);
          
          setLoadingSubmessage(`Tentativa ${pollCount}/${maxPolls} - ${Math.round(progress)}%`);
        }
        
      } catch (error) {
        console.error('Erro no polling:', error);
        
        // ✅ ERRO NO POLLING - TENTAR MAIS ALGUMAS VEZES
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setProcessingKey(null);
          setIsSubmitting(false);
          
          toast.error('Tempo esgotado. Tente novamente.');
        }
      }
    }, 2000); // Poll a cada 2 segundos

    return () => {
      clearInterval(pollInterval);
    };
  }, [processingKey, isPolling]);

  // ✅ FUNÇÃO OTIMIZADA DE VERIFICAÇÃO DE TELEFONE
  const checkPhoneOptimized = async (phone: string): Promise<{ exists: boolean; userId: string | null }> => {
    try {
      const response = await fetch('/api/client-auth-v3/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          throw new Error(data.error || 'Muitas tentativas. Aguarde um momento.');
        }
        throw new Error('Erro na verificação de telefone');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro na verificação');
      }

      // ✅ LOG PARA DEBUG
      console.log(`[PHONE-CHECK-V2] ${phone}: ${result.exists ? 'EXISTE' : 'NÃO EXISTE'} (${result.source}, ${result.responseTime}ms)`);

      return {
        exists: result.exists,
        userId: result.userId
      };
      
    } catch (error) {
      console.error('Erro na verificação de telefone:', error);
      throw error;
    }
  };

  // ✅ FUNÇÃO OTIMIZADA DE SOLICITAÇÃO DE ACESSO
  const requestAccessOptimized = async () => {
    if (!currentUser) {
      toast.error('Você precisa estar autenticado para solicitar acesso');
      return;
    }
    
    setIsSubmitting(true);
    setLoadingMessage('Processando sua solicitação...');
    setLoadingSubmessage('Iniciando criação do QR Code');
    setProcessingProgress(0);
    
    try {
      // ✅ VALIDAÇÕES
      if (!eventId || !promoterId || !teamId || !currentUser.id) {
        throw new Error('Dados incompletos para processar solicitação');
      }
      
      const userData = {
        event_id: eventId,
        client_user_id: currentUser.id,
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        phone: currentUser.phone || '',
        promoter_id: promoterId,
        team_id: teamId
      };
      
      setLoadingSubmessage('Enviando dados para processamento...');
      
      // ✅ CHAMADA PARA API OTIMIZADA
      const response = await fetch('/api/client-auth-v3/guests/create-instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          const data = await response.json();
          throw new Error(data.error || 'Limite de tentativas atingido');
        }
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro na criação');
      }
      
      // ✅ GUEST EXISTENTE
      if (result.isExisting && result.data?.qr_code_url) {
        setQrCodeUrl(result.data.qr_code_url);
        setShowQRCode(true);
        setCompletedSteps(prev => [...prev, 'qr']);
        toast.success('Você já está na Guest List!');
        setIsSubmitting(false);
        return;
      }
      
      // ✅ PROCESSAMENTO ASSÍNCRONO
      if (result.processing && result.processingKey) {
        setProcessingKey(result.processingKey);
        setIsPolling(true);
        setLoadingMessage('QR Code sendo criado...');
        setLoadingSubmessage('Processando em background - aguarde');
        
        toast.info('Processando... Você receberá seu QR em instantes.');
        return;
      }
      
      // ✅ RESPOSTA DIRETA (fallback)
      if (result.data?.qr_code_url) {
        setQrCodeUrl(result.data.qr_code_url);
        setShowQRCode(true);
        setCompletedSteps(prev => [...prev, 'qr']);
        toast.success('QR Code criado!');
        setIsSubmitting(false);
        return;
      }
      
      throw new Error('Resposta inesperada da API');
      
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      
      let errorMessage = 'Erro ao solicitar acesso';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setIsSubmitting(false);
      setIsPolling(false);
      setProcessingKey(null);
    }
  };

  // ✅ HANDLER OTIMIZADO PARA VERIFICAÇÃO DE TELEFONE
  const handlePhoneVerified = async (phone: string, exists: boolean, userId: string | null = null) => {
    setCompletedSteps(['phone']);
    setPhone(phone);
    if (userId) setUserId(userId);
    
    if (exists === true) {
      setAuthStep('login');
    } else {
      setAuthStep('register');
    }
  };

  // ✅ HANDLERS DE LOGIN E REGISTRO (mantidos do original)
  const handleLoginSuccess = async (userData: any) => {
    try {
      setCompletedSteps(['phone', 'auth']);
      
      const normalizedUser = {
        id: userData.id || userData.user_id || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || phone
      };
      
      setCurrentUser(normalizedUser);
      setDialogOpen(false);
      
      toast.success('Login realizado com sucesso');
    } catch (error) {
      console.error('Erro ao processar login:', error);
      toast.error('Erro ao processar login');
    }
  };

  const handleRegisterSuccess = async (userData: any) => {
    try {
      setCompletedSteps(['phone', 'auth']);
      
      const user = userData.user || userData;
      const normalizedUser = {
        id: user.id || user.user_id || '',
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        phone: user.phone || phone
      };
      
      setCurrentUser(normalizedUser);
      setDialogOpen(false);
      setAuthStep('phone');
      
      toast.success('Registro realizado com sucesso');
    } catch (error) {
      console.error('Erro ao processar registro:', error);
      toast.error('Erro ao processar registro');
    }
  };

  const startPhoneVerification = () => {
    setAuthStep('phone');
    setDialogOpen(true);
  };

  // ✅ COMPONENTE DE PROGRESSO PERSONALIZADO PARA POLLING
  const PollingProgress = () => (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${processingProgress}%` }}
        />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4 animate-spin" />
        <span>Criando seu QR Code...</span>
      </div>
    </div>
  );
  
  return (
    <LoadingOverlay 
      isLoading={isSubmitting && !isPolling} 
      message={loadingMessage} 
      submessage={loadingSubmessage}
    >
      <Card className={`w-full bg-transparent border-0 shadow-none ${className}`}>
        {currentUser && (
          <CardHeader>
            <CardTitle className="text-xl text-center text-white">
              Olá, {currentUser.firstName || 'Convidado'}! <span className="text-blue-400 text-sm">v2</span>
            </CardTitle>
          </CardHeader>
        )}
        
        <CardContent>
          {showQRCode && qrCodeUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-3 sm:p-4 rounded-lg shadow-lg">
                <Image 
                  src={qrCodeUrl} 
                  alt="QR Code de acesso" 
                  width={200} 
                  height={200} 
                  priority
                  className="rounded-md w-[180px] h-[180px] sm:w-[200px] sm:h-[200px]"
                />
              </div>
              <div className="text-center px-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <p className="text-green-600 font-medium text-sm sm:text-base">Acesso aprovado!</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Apresente este QR code na entrada do evento
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowQRCode(false)}
                className="text-xs sm:text-sm px-3 sm:px-4"
              >
                Esconder QR
              </Button>
            </div>
          ) : currentUser ? (
            <div className="flex flex-col items-center gap-4">
              {/* ✅ PROGRESSO DE POLLING */}
              {isPolling && (
                <div className="w-full">
                  <PollingProgress />
                </div>
              )}
              
              <Button 
                onClick={requestAccessOptimized} 
                disabled={isSubmitting}
                className="w-full"
                style={buttonStyle}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPolling ? 'Processando...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    Solicitar QR Code
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                onClick={startPhoneVerification}
                className="w-full"
                style={buttonStyle}
              >
                <Phone className="mr-2 h-4 w-4" />
                Entrar com o Telemóvel
              </Button>
            </div>
          )}
        </CardContent>
        
        {/* Dialog para autenticação */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md p-0 mx-auto max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Acesso à Guest List</DialogTitle>
            <DialogDescription className="sr-only">
              Processo de autenticação otimizado para acesso à lista de convidados. Siga as etapas para verificar seu telefone e obter seu QR code de entrada.
            </DialogDescription>
            
            {/* Progress Steps */}
            <div className="p-4 sm:p-6 pb-0">
              <ProgressSteps 
                currentStep={authStep === 'phone' ? 'phone' : authStep === 'login' || authStep === 'register' ? 'auth' : 'qr'} 
                completedSteps={completedSteps}
              />
            </div>
            
            {authStep === 'phone' && (
              <div className="p-2 sm:p-0">
                <PhoneVerificationForm 
                  onVerified={handlePhoneVerified}
                  optimizedCheck={checkPhoneOptimized}
                />
              </div>
            )}
            
            {authStep === 'login' && (
              <div className="p-2 sm:p-0">
                <ClientLoginForm 
                  phone={phone} 
                  userId={userId}
                  onSuccess={handleLoginSuccess} 
                  onBack={() => setAuthStep('phone')} 
                />
              </div>
            )}
            
            {authStep === 'register' && (
              <div className="p-2 sm:p-0">
                <ClientRegistrationForm 
                  phone={phone} 
                  onSuccess={handleRegisterSuccess}
                  onBack={() => setAuthStep('phone')}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Card>
    </LoadingOverlay>
  );
} 