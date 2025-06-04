'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, Phone } from 'lucide-react';
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
}

export function GuestRequestClient({
  eventId,
  promoterId,
  teamId,
  className = ''
}: GuestRequestProps) {
  const [currentUser, setCurrentUser] = useState<ClientUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // States para controle de progresso e feedback
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubmessage, setLoadingSubmessage] = useState('');
  
  // 🔧 DEBUG: Monitor state changes
  useEffect(() => {
    console.log('🔧 [DEBUG] STATE CHANGE - currentUser:', currentUser?.firstName || 'null');
  }, [currentUser]);
  
  useEffect(() => {
    console.log('🔧 [DEBUG] STATE CHANGE - dialogOpen:', dialogOpen);
  }, [dialogOpen]);
  
  // Função para solicitar acesso ao evento (gerar QR code)
  const requestAccess = async () => {
    if (!currentUser) {
      toast.error('Você precisa estar autenticado para solicitar acesso');
      return;
    }
    
    setIsSubmitting(true);
    setLoadingMessage('Gerando seu QR Code...');
    setLoadingSubmessage('Validando dados e criando acesso');
    
    try {
      // Verificar se temos todos os IDs necessários
      if (!eventId) throw new Error('ID do evento não fornecido');
      if (!promoterId) throw new Error('ID do promotor não fornecido');
      if (!teamId) throw new Error('ID da equipe não fornecido');
      if (!currentUser.id) throw new Error('ID do usuário não fornecido');
      
      console.log('Solicitando acesso para o evento');
      setLoadingSubmessage('Conectando com o servidor...');
      
      // Dados do usuário para enviar para a API
      const userData = {
        event_id: eventId,
        client_user_id: currentUser.id,
        name: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim(),
        phone: currentUser.phone || '',
        promoter_id: promoterId,
        team_id: teamId
      };
      
      setLoadingSubmessage('Processando sua solicitação...');
      
      // Chamada para a nova API client-auth que contorna o middleware
      const response = await fetch('/api/client-auth/guests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      setLoadingSubmessage('Finalizando...');
      
      // Verificar resposta
      if (!response.ok) {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        
        // Tentar obter detalhes do erro
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao processar solicitação');
        } catch (e) {
          throw new Error(`Erro na API (${response.status}): ${response.statusText}`);
        }
      }
      
      // Processar resposta com sucesso
      const result = await response.json();
      console.log('Resposta da API de criação de convidado:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido na API');
      }
      
      // QR Code foi gerado pelo servidor
      if (result.data && result.data.qr_code_url) {
        // Marcar etapa QR como completa
        setCompletedSteps(prev => [...prev, 'qr']);
        
        // Atualizar a interface com o QR code
        setQrCodeUrl(result.data.qr_code_url);
        
        // Mostrar o QR code
        setShowQRCode(true);
        
        // Mensagem diferente para guest existente vs novo guest
        if (result.isExisting) {
          toast.success(result.message || 'Você já está na Guest List! Aqui está seu QR Code.');
        } else {
          toast.success(result.message || 'Acesso confirmado! Seu QR code está pronto.');
        }
      } else {
        throw new Error('QR Code não retornado pela API');
      }
      
    } catch (error) {
      console.error('Erro ao solicitar acesso via API:', error);
      
      // Tratamento de erro melhorado
      let errorMessage = 'Erro ao solicitar acesso';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        errorMessage = errorObj.message || errorObj.error || errorObj.statusText || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
      setLoadingMessage('');
      setLoadingSubmessage('');
    }
  };
  
  // Handler para quando o telefone é verificado
  const handlePhoneVerified = (phone: string, exists: boolean, userId: string | null = null) => {
    console.log(`Telefone verificado: ${phone}, Usuário existe: ${exists ? 'Sim' : 'Não'}`);
    
    // Marcar step de telefone como completo
    setCompletedSteps(['phone']);
    
    // Armazenar o telefone e userId para uso posterior
    setPhone(phone);
    if (userId) setUserId(userId);
    
    // Navegar para o próximo passo com base no resultado da verificação
    if (exists === true) {
      setAuthStep('login');
    } else {
      setAuthStep('register');
    }
  };
  
  // Handler para sucesso no login
  const handleLoginSuccess = async (userData: any) => {
    console.log('Login bem-sucedido:', userData);
    try {
      // Marcar step de auth como completo
      setCompletedSteps(['phone', 'auth']);
      
      // Normalizar dados do usuário
      const normalizedUser = {
        id: userData.id || userData.user_id || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || phone
      };
      
      // Atualizar state local (sem useClientAuth)
      setCurrentUser(normalizedUser);
      
      // Fechar o diálogo de autenticação
      setDialogOpen(false);
      
      toast.success('Login realizado com sucesso');
    } catch (error) {
      console.error('Erro ao processar login:', error);
      toast.error('Ocorreu um erro ao processar o login. Tente novamente.');
    }
  };

  // Handler para sucesso no registro
  const handleRegisterSuccess = async (userData: any) => {
    console.log('🔧 [DEBUG] Registro bem-sucedido - INÍCIO:', userData);
    try {
      // Marcar step de auth como completo
      setCompletedSteps(['phone', 'auth']);
      console.log('🔧 [DEBUG] Steps marcados como completos');
      
      // CORRIGIDO: Extrair dados do user que vem dentro de userData
      const user = userData.user || userData; // userData.user se a API retorna { success: true, user: {...} }
      console.log('🔧 [DEBUG] User extraído:', user);
      
      // Normalizar dados do usuário
      const normalizedUser = {
        id: user.id || user.user_id || '',
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        phone: user.phone || phone
      };
      
      console.log('🔧 [DEBUG] Dados normalizados do usuário:', {
        id: normalizedUser.id?.substring(0, 8) + '...',
        firstName: normalizedUser.firstName,
        lastName: normalizedUser.lastName,
        phone: normalizedUser.phone?.substring(0, 3) + '****'
      });
      
      // Atualizar state local (sem useClientAuth)
      console.log('🔧 [DEBUG] ANTES setCurrentUser - currentUser atual:', currentUser);
      setCurrentUser(normalizedUser);
      console.log('🔧 [DEBUG] DEPOIS setCurrentUser chamado');
      
      // Fechar o diálogo de autenticação
      console.log('🔧 [DEBUG] ANTES setDialogOpen(false) - dialogOpen atual:', dialogOpen);
      setDialogOpen(false);
      console.log('🔧 [DEBUG] DEPOIS setDialogOpen(false) chamado');
      
      // Resetar authStep para evitar problemas
      console.log('🔧 [DEBUG] Resetando authStep para phone');
      setAuthStep('phone');
      
      toast.success('Registro realizado com sucesso');
      console.log('🔧 [DEBUG] Toast mostrado - FIM handleRegisterSuccess');
    } catch (error) {
      console.error('🔧 [DEBUG] ERRO ao processar registro:', error);
      toast.error('Ocorreu um erro ao processar o registro. Tente novamente.');
    }
  };

  // Função para iniciar verificação de telefone
  const startPhoneVerification = () => {
    setAuthStep('phone');
    setDialogOpen(true);
  };
  
  return (
    <LoadingOverlay 
      isLoading={isSubmitting} 
      message={loadingMessage} 
      submessage={loadingSubmessage}
    >
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="text-xl text-center">
            {currentUser 
              ? `Olá, ${currentUser.firstName || 'Convidado'}!` 
              : 'Acesse a lista de convidados'}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
        {showQRCode && qrCodeUrl ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <Image 
                src={qrCodeUrl} 
                alt="QR Code de acesso" 
                width={250} 
                height={250} 
                priority
                className="rounded-md"
              />
            </div>
            <div className="text-center">
              <p className="text-green-600 font-medium">Acesso aprovado!</p>
              <p className="text-sm text-muted-foreground">
                Apresente este QR code na entrada do evento
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setShowQRCode(false)}
            >
              Esconder QR
            </Button>
          </div>
          ) : currentUser ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <Phone className="h-6 w-6" />
                <span className="font-medium">Autenticado como {currentUser.firstName}</span>
              </div>
        <Button 
                onClick={requestAccess} 
          disabled={isSubmitting}
                className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
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
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="h-5 w-5" />
                <span>Informe seu número para acessar</span>
              </div>
              <Button
                onClick={startPhoneVerification}
                className="w-full"
              >
                Entrar com telefone
              </Button>
            </div>
          )}
        </CardContent>
        
        {/* Dialog para autenticação */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-full max-w-md p-0 mx-auto max-h-[80vh] overflow-y-auto">
            <DialogTitle className="sr-only">Acesso à Guest List</DialogTitle>
            <DialogDescription className="sr-only">
              Processo de autenticação para acesso à lista de convidados. Siga as etapas para verificar seu telefone e obter seu QR code de entrada.
            </DialogDescription>
            
            {/* Progress Steps */}
            <div className="p-6 pb-0">
              <ProgressSteps 
                currentStep={authStep === 'phone' ? 'phone' : authStep === 'login' || authStep === 'register' ? 'auth' : 'qr'} 
                completedSteps={completedSteps}
              />
            </div>
            
            {authStep === 'phone' && (
              <PhoneVerificationForm onVerified={handlePhoneVerified} />
            )}
            
            {authStep === 'login' && (
              <ClientLoginForm 
                phone={phone} 
                userId={userId}
                onSuccess={handleLoginSuccess} 
                onBack={() => setAuthStep('phone')} 
              />
            )}
            
            {authStep === 'register' && (
              <div className="py-1 px-2">
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