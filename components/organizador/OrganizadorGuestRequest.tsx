'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2, UserCheck, ArrowRight, Phone } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerificationForm } from '@/components/client-auth/PhoneVerificationForm';
import ClientLoginForm from '@/components/client-auth/ClientLoginForm';
import ClientRegistrationForm from '@/components/client-auth/ClientRegistrationForm';
import { ProgressSteps } from '@/components/ui/progress-steps';
import { LoadingOverlay } from '@/components/ui/loading-overlay';

interface OrganizadorGuestRequestProps {
  eventId: string;
  className?: string;
}

export function OrganizadorGuestRequest({
  eventId,
  className = ''
}: OrganizadorGuestRequestProps) {
  const { user, updateUser } = useClientAuth();
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
  
  // 🔍 VERIFICAÇÃO AUTOMÁTICA: Verificar se usuário já é guest quando fizer login
  useEffect(() => {
    const checkExistingGuest = async () => {
      console.log('[ORGANIZADOR-AUTO-CHECK] useEffect disparado:', { 
        hasUser: !!user?.id, 
        userId: user?.id?.substring(0, 8) + '...', 
        showQRCode, 
        eventId: eventId?.substring(0, 8) + '...' 
      });
      
      if (!user?.id || showQRCode) {
        console.log('[ORGANIZADOR-AUTO-CHECK] Saindo: usuário não logado ou QR já mostrado');
        return;
      }
      
      try {
        console.log('[ORGANIZADOR-AUTO-CHECK] Verificando se usuário já é guest da organização...');
        
        const userData = {
          event_id: eventId,
          client_user_id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          phone: user.phone || ''
        };
        
        console.log('[ORGANIZADOR-AUTO-CHECK] Enviando dados:', {
          event_id: userData.event_id?.substring(0, 8) + '...',
          client_user_id: userData.client_user_id?.substring(0, 8) + '...',
          name: userData.name,
          phone: userData.phone?.substring(0, 3) + '****'
        });
        
        const response = await fetch('/api/organizador/guests/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });
        
        console.log('[ORGANIZADOR-AUTO-CHECK] Resposta recebida:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('[ORGANIZADOR-AUTO-CHECK] Resultado:', result);
          
          if (result.success && result.data?.qr_code_url) {
            console.log('[ORGANIZADOR-AUTO-CHECK] Guest criado/existente, mostrando QR...');
            setQrCodeUrl(result.data.qr_code_url);
            setShowQRCode(true);
            setCompletedSteps(['phone', 'auth', 'qr']);
            
            if (result.isExisting) {
              toast.info('Você já está na Guest List deste evento!');
            } else {
              toast.success(result.message || 'QR Code gerado com sucesso!');
            }
          } else {
            console.log('[ORGANIZADOR-AUTO-CHECK] Resposta inesperada:', result);
          }
        } else {
          const errorData = await response.text();
          console.error('[ORGANIZADOR-AUTO-CHECK] Erro na resposta:', response.status, errorData);
        }
      } catch (error) {
        console.error('[ORGANIZADOR-AUTO-CHECK] Erro ao verificar guest existente:', error);
      }
    };
    
    checkExistingGuest();
  }, [user, eventId, showQRCode]);
  
  // Função para solicitar acesso ao evento (gerar QR code)
  const requestAccess = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para solicitar acesso');
      return;
    }
    
    setIsSubmitting(true);
    setLoadingMessage('Gerando seu QR Code...');
    setLoadingSubmessage('Validando dados e criando acesso');
    
    try {
      if (!eventId) throw new Error('ID do evento não fornecido');
      if (!user.id) throw new Error('ID do usuário não fornecido');
      
      console.log('Solicitando acesso ao evento pela organização');
      setLoadingSubmessage('Conectando com o servidor...');
      
      const userData = {
        event_id: eventId,
        client_user_id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        phone: user.phone || ''
      };
      
      setLoadingSubmessage('Processando sua solicitação...');
      
      // Chamada para a API da organização
      const response = await fetch('/api/organizador/guests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      setLoadingSubmessage('Finalizando...');
      
      if (!response.ok) {
        console.error('Erro na resposta da API:', response.status, response.statusText);
        
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao processar solicitação');
        } catch (e) {
          throw new Error(`Erro na API (${response.status}): ${response.statusText}`);
        }
      }
      
      const result = await response.json();
      console.log('Resposta da API de criação de convidado da organização:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido na API');
      }
      
      if (result.data && result.data.qr_code_url) {
        setCompletedSteps(prev => [...prev, 'qr']);
        setQrCodeUrl(result.data.qr_code_url);
        setShowQRCode(true);
        
        if (result.isExisting) {
          toast.success(result.message || 'Você já está na Guest List! Aqui está seu QR Code.');
        } else {
          toast.success(result.message || 'Acesso confirmado! Seu QR code está pronto.');
        }
      } else {
        throw new Error('QR Code não retornado pela API');
      }
      
    } catch (error) {
      console.error('Erro ao solicitar acesso via API da organização:', error);
      
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
  
  // Manipuladores de eventos de autenticação
  const handlePhoneVerified = async (phoneNumber: string, exists: boolean, returnedUserId?: string) => {
    console.log('[ORGANIZADOR] Telefone verificado:', phoneNumber, 'Usuário existe:', exists ? 'Sim' : 'Não');
    
    setPhone(phoneNumber);
    if (returnedUserId) {
      setUserId(returnedUserId);
    }
    
    setCompletedSteps(['phone']);
    setAuthStep(exists ? 'login' : 'register');
  };
  
  const handleLoginSuccess = async (userData: any) => {
    console.log('[ORGANIZADOR] Login bem-sucedido:', userData);
    try {
      // Marcar step de auth como completo
      setCompletedSteps(['phone', 'auth']);
      
      // Normalizar dados do usuário (igual ao sistema /promo)
      const normalizedUser = {
        id: userData.id || userData.user_id || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || phone
      };
      
      console.log('📝 Dados normalizados do usuário:', {
        id: normalizedUser.id?.substring(0, 8) + '...',
        firstName: normalizedUser.firstName,
        lastName: normalizedUser.lastName,
        phone: normalizedUser.phone?.substring(0, 3) + '****'
      });
      
      // ✅ CRÍTICO: Usar await para garantir que o contexto seja atualizado
      await updateUser(normalizedUser);
      console.log('✅ Usuário atualizado no contexto');
      
      // Fechar o diálogo de autenticação
      setDialogOpen(false);
      console.log('✅ Diálogo fechado - useEffect deveria disparar agora');
      
      toast.success('Login realizado com sucesso');
    } catch (error) {
      console.error('Erro ao processar login:', error);
      toast.error('Ocorreu um erro ao processar o login. Tente novamente.');
    }
  };
  
  const handleRegisterSuccess = async (userData: any) => {
    console.log('[ORGANIZADOR] Registro bem-sucedido:', userData);
    try {
      // Marcar step de auth como completo
      setCompletedSteps(['phone', 'auth']);
      
      // CORRIGIDO: Extrair dados do user que vem dentro de userData
      const user = userData.user || userData; // userData.user se a API retorna { success: true, user: {...} }
      
      // Normalizar dados do usuário
      const normalizedUser = {
        id: user.id || user.user_id || '',
        firstName: user.firstName || user.first_name || '',
        lastName: user.lastName || user.last_name || '',
        email: user.email || '',
        phone: user.phone || phone
      };
      
      console.log('📝 Dados normalizados do usuário:', {
        id: normalizedUser.id?.substring(0, 8) + '...',
        firstName: normalizedUser.firstName,
        lastName: normalizedUser.lastName,
        phone: normalizedUser.phone?.substring(0, 3) + '****'
      });
      
      // ✅ CRÍTICO: Usar await para garantir que o contexto seja atualizado
      await updateUser(normalizedUser);
      console.log('✅ Usuário atualizado no contexto');
      
      // Fechar o diálogo de autenticação
      setDialogOpen(false);
      console.log('✅ Diálogo fechado - useEffect deveria disparar agora');
      
      toast.success('Registro realizado com sucesso');
    } catch (error) {
      console.error('Erro ao processar registro:', error);
      toast.error('Ocorreu um erro ao processar o registro. Tente novamente.');
    }
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
            {user 
              ? `Olá, ${user.firstName || 'Convidado'}!` 
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
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <UserCheck className="h-6 w-6" />
              <span className="font-medium">Autenticado</span>
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
              onClick={() => setDialogOpen(true)}
              className="w-full"
            >
              Entrar com telefone
            </Button>
          </div>
        )}
        </CardContent>
        
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