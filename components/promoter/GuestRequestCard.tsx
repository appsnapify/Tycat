'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Loader2, UserCheck, Phone, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Image from 'next/image';
import { ClientUser } from '@/types/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerificationForm } from '@/components/client-auth/PhoneVerificationForm';
import ClientLoginForm from '@/components/client-auth/ClientLoginForm';
import ClientRegistrationForm from '@/components/client-auth/ClientRegistrationForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { createClient } from '@/lib/supabase/client';
// Importar as Server Actions
import { checkExistingGuest, createGuestRecord, updateGuestQRCode, generateEmergencyId } from '@/app/actions/promo';

interface GuestRequestCardProps {
  eventId: string;
  promoterId: string;
  teamId: string;
  className?: string;
}

export function GuestRequestCard({
  eventId,
  promoterId,
  teamId,
  className = ''
}: GuestRequestCardProps) {
  const { user, updateUser } = useClientAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Função para gerar QR code com fallback
  const generateQRCode = async (guestId: string): Promise<string> => {
    try {
      console.log(`Gerando QR code para guestId: ${guestId}`);
      
      // Usar a API de QR code com parâmetros completos
      const timestamp = Date.now();
      const qrData = `guest_${guestId}_event_${eventId}_${timestamp}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
      
      console.log('QR code gerado com sucesso via API externa');
      return qrCodeUrl;
    } catch (error) {
      console.error('Erro ao gerar QR code, usando fallback:', error);
      // Fallback para URL alternativa
      const timestamp = Date.now();
      const qrData = `guest_${guestId}_event_${eventId}_${timestamp}`;
      return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(qrData)}`;
    }
  };
  
  // Normalizar o formato do número de telefone para consulta no banco de dados
  const normalizePhoneNumber = (phoneNumber: string): string => {
    try {
      // Se o telefone já está em formato internacional, retornar como está
      if (phoneNumber.startsWith('+')) {
        console.log('Telefone já em formato internacional:', phoneNumber);
        return phoneNumber;
      }
      
      // Para números portugueses - começando com 9 e tendo 9 dígitos
      const cleanedPhone = phoneNumber.replace(/[\s\-()]/g, '');
      if (/^9\d{8}$/.test(cleanedPhone)) {
        console.log('Telefone é um número português (9 + 8 dígitos):', cleanedPhone);
        return '+351' + cleanedPhone;
      }
      
      // Se não tem formato específico, usar validação padrão
      if (isValidPhoneNumber(phoneNumber)) {
        return phoneNumber;
      }
      
      // Caso não seja formato reconhecido, adicionar prefixo de Portugal como padrão
      return '+351' + cleanedPhone;
    } catch (error) {
      console.error('Erro ao normalizar número de telefone:', error);
      return phoneNumber;
    }
  };
  
  // Verificar o número usando a API em vez do Supabase diretamente
  const checkPhoneExists = async (phoneNumber: string): Promise<{exists: boolean, userId: string | null}> => {
    try {
      console.log('Verificando existência do telefone via API:', phoneNumber);
      
      const response = await fetch('/api/client-auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      
      // Obter texto de erro, se disponível
      const responseText = await response.text();
      let data;
      
      try {
        // Tentar analisar como JSON
        data = JSON.parse(responseText);
      } catch (e) {
        // Se não for JSON válido, criar objeto com mensagem de erro
        console.error('Resposta não é JSON válido:', responseText);
        throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}`);
      }
      
      // Verificar erros na resposta
      if (!response.ok) {
        const errorMsg = data?.error || response.statusText;
        console.error('Erro na resposta:', data);
        throw new Error(`Erro na verificação (${response.status}): ${errorMsg}`);
      }
      
      console.log('Resposta da API de verificação:', data);
      
      return {
        exists: !!data.exists,
        userId: data.userId || null
      };
    } catch (error) {
      console.error('Erro ao verificar telefone via API:', error);
      // Mostrar toast com erro para melhor experiência de usuário
      toast.error(`Erro ao verificar telefone: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };
  
  // Verificar número de telefone inserido diretamente
  const verifyPhoneDirectly = async () => {
    if (!inputPhone || inputPhone.length < 9) {
      toast.error('Por favor, insira um número de telefone válido');
      return;
    }
    
    try {
      setIsVerifying(true);
      
      // Garantir que o número está em formato válido
      if (!isValidPhoneNumber(inputPhone)) {
        toast.error('Formato de telefone inválido');
        setIsVerifying(false);
        return;
      }
      
      // Normalizar o número para o formato usado no banco de dados
      const normalizedPhone = normalizePhoneNumber(inputPhone);
      console.log('Número de telefone normalizado:', normalizedPhone);
      console.log('Número de telefone original:', inputPhone);
      
      // Verificar se o usuário existe usando a API
      const { exists, userId } = await checkPhoneExists(normalizedPhone);
      console.log('Resultado da verificação:', { exists, userId });
      
      // Definir o telefone verificado para o fluxo de autenticação
      setPhone(normalizedPhone);
      
      // Determinar se o usuário existe e prosseguir com o fluxo adequado
      if (exists) {
        // Usuário existe, ir para o login
        console.log('Usuário existe, redirecionando para login');
        setUserId(userId);
        setAuthStep('login');
        setDialogOpen(true);
      } else {
        // Usuário não existe, ir para o registro
        console.log('Usuário não existe, redirecionando para registro');
        setAuthStep('register');
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Erro ao verificar telefone:', error);
      toast.error('Ocorreu um erro ao verificar seu telefone');
    } finally {
      setIsVerifying(false);
    }
  };

  // Função para solicitar acesso ao evento (gerar QR code)
  const requestAccess = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para solicitar acesso');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Verificar se temos todos os IDs necessários
      if (!eventId) throw new Error('ID do evento não fornecido');
      if (!promoterId) throw new Error('ID do promotor não fornecido');
      if (!teamId) throw new Error('ID da equipe não fornecido');
      if (!user.id) throw new Error('ID do usuário não fornecido');
      
      console.log('Solicitando acesso para o evento');
      
      // Verificar se o convidado já existe usando Server Action
      const existingGuestResult = await checkExistingGuest(eventId, user.id);
      
      if (existingGuestResult.error) {
        console.error('Erro ao verificar convidado existente:', existingGuestResult.error);
      }
      
      let guestId: string;
      let qrCode: string;
      
      if (existingGuestResult.data) {
        // Se já existir um pedido, usar o QR code existente ou gerar um novo
        guestId = existingGuestResult.data.id;
        console.log('Pedido existente encontrado com ID:', guestId);
        
        // MENSAGEM PARA PEDIDO EXISTENTE
        toast.info("Encontrámos o seu pedido anterior para este evento. A apresentar o seu QR code.");

        if (existingGuestResult.data.qr_code_url) {
          qrCode = existingGuestResult.data.qr_code_url;
          console.log('Usando QR code existente');
        } else {
          console.log('Gerando novo QR code para pedido existente');
          qrCode = await generateQRCode(guestId);
          
          // Atualizar o registro com a URL do QR code usando Server Action
          const updateResult = await updateGuestQRCode(guestId, qrCode);
          
          if (updateResult.error) {
            console.error('Erro detalhado ao atualizar registro:', updateResult.error);
            // Não lançar erro aqui para continuar com o processo
          } else {
            console.log('Registro atualizado com sucesso');
          }
        }
      } else {
        // Criar novo pedido usando Server Action
        console.log('Criando novo pedido de convidado...');
        
        try {
          const createResult = await createGuestRecord({
            eventId,
            clientUserId: user.id,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            phone: user.phone || '',
            promoterId,
            teamId
          });
          
          if (createResult.error) {
            console.error('Erro detalhado ao criar pedido:', createResult.error);
            throw new Error(`Falha ao criar pedido: ${createResult.error}`);
          } 
          
          if (!createResult.data) {
            throw new Error('Falha ao criar pedido: retorno vazio');
          }
          
          guestId = createResult.data.id;
          console.log('Pedido criado com sucesso, ID:', guestId);
          
          // Gerar QR code
          qrCode = await generateQRCode(guestId);
          console.log('QR code gerado:', qrCode);
          
          // Atualizar o registro com a URL do QR code
          const updateResult = await updateGuestQRCode(guestId, qrCode);
          
          if (updateResult.error) {
            console.error('Erro ao atualizar QR code:', updateResult.error);
            // Não lançar erro aqui, pois já temos o ID do convidado e o QR code
          } else {
            console.log('QR code atualizado com sucesso');
          }
          // MENSAGEM PARA NOVO PEDIDO
          toast.success('Acesso aprovado! O seu novo QR code está pronto.');

        } catch (insertError) {
          console.error('Erro na operação de inserção:', insertError);
          // Se ocorrer erro na inserção, gerar um ID e QR code de emergência
          console.log('Gerando QR code de emergência');
          const emergency = await generateEmergencyId();
          guestId = emergency.id;
          qrCode = await generateQRCode(guestId);
          // MENSAGEM PARA QR CODE DE EMERGÊNCIA (NOVO PEDIDO)
          toast.warn('Atenção: O seu QR code foi gerado em modo de emergência.');
        }
      }
      
      // Atualizar o estado com a URL do QR code e mostrar
      setQrCodeUrl(qrCode);
      setShowQRCode(true);
      
    } catch (error) {
      console.error('Erro ao solicitar acesso:', error);
      
      // Melhorar o tratamento de erro para capturar mais detalhes
      let errorMessage = 'Erro ao solicitar acesso';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      } else if (typeof error === 'object' && error !== null) {
        // Tentar extrair mensagem de erro de objetos
        const errorObj = error as any;
        errorMessage = errorObj.message || errorObj.error || errorObj.statusText || JSON.stringify(error);
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handler para quando o telefone é verificado
  const handlePhoneVerified = (phone: string, exists: boolean, userId: string | null = null) => {
    console.log(`Telefone verificado: ${phone}, Usuário existe: ${exists ? 'Sim' : 'Não'}`);
    
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
      // Normalizar dados do usuário
      const normalizedUser = {
        id: userData.id || userData.user_id || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || phone
      };
      
      // Atualizar contexto de autenticação
      await updateUser(normalizedUser);
      
      // Fechar o diálogo de autenticação
      setDialogOpen(false);
      
      toast.success('Login realizado com sucesso');
      
      // Limpar o campo de entrada de telefone
      setInputPhone('');
    } catch (error) {
      console.error('Erro ao processar login:', error);
      toast.error('Ocorreu um erro ao processar o login. Tente novamente.');
    }
  };

  // Handler para sucesso no registro
  const handleRegisterSuccess = async (userData: any) => {
    console.log('Registro bem-sucedido:', userData);
    try {
      // Normalizar dados do usuário
      const normalizedUser = {
        id: userData.id || userData.user_id || '',
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        email: userData.email || '',
        phone: userData.phone || phone
      };
      
      // Atualizar contexto de autenticação
      await updateUser(normalizedUser);
      
      // Fechar o diálogo de autenticação
      setDialogOpen(false);
      
      toast.success('Registro realizado com sucesso');
      
      // Limpar o campo de entrada de telefone
      setInputPhone('');
    } catch (error) {
      console.error('Erro ao processar registro:', error);
      toast.error('Ocorreu um erro ao processar o registro. Tente novamente.');
    }
  };
  
  return (
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
              <span className="font-medium">Autenticado como {user.phone}</span>
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
                'Solicitar QR Code'
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-3">
              <Phone className="h-5 w-5" />
              <span>Informe seu número para acessar</span>
            </div>
            
            <div className="flex items-center gap-2 w-full max-w-md">
              <div className="flex-1 relative">
                <PhoneInput
                  international={false}
                  defaultCountry="PT"
                  flags={flags}
                  value={inputPhone}
                  onChange={(value) => {
                    console.log('PhoneInput onChange valor recebido:', value);
                    setInputPhone(value || '');
                  }}
                  placeholder="Digite seu telefone"
                  className="w-full rounded-full PhoneInputCustom"
                />
              </div>
              <Button
                onClick={verifyPhoneDirectly}
                disabled={isVerifying || !inputPhone}
                size="icon"
                className="rounded-full bg-indigo-400 hover:bg-indigo-500"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground text-center mt-1">
              Ex: 912345678 ou +351912345678
            </p>
          </div>
        )}
      </CardContent>
      
      {/* Dialog para autenticação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-md p-0 mx-auto max-h-[80vh] overflow-y-auto">
          <DialogTitle className="sr-only">Acesso à Guest List</DialogTitle>
          
          {authStep === 'phone' && (
            <PhoneVerificationForm onVerified={handlePhoneVerified} defaultPhone={phone} />
          )}
          
          {authStep === 'login' && (
            <ClientLoginForm 
              phone={phone} 
              userId={userId}
              onSuccess={handleLoginSuccess} 
              onBack={() => setDialogOpen(false)} 
            />
          )}
          
          {authStep === 'register' && (
            <div className="py-1 px-2">
              <ClientRegistrationForm 
                phone={phone} 
                onSuccess={handleRegisterSuccess}
                onBack={() => setDialogOpen(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .PhoneInputCustom {
          border-radius: 9999px;
          padding: 6px 12px;
          border: 1px solid hsl(var(--input));
          background-color: hsl(var(--background));
        }
        
        .PhoneInputCustom .PhoneInputInput {
          border: none;
          padding: 6px 8px;
          background-color: transparent;
          outline: none;
          flex: 1;
          font-size: 1rem;
        }
        
        .PhoneInputCustom .PhoneInputCountry {
          margin-right: 8px;
        }
        
        /* Estilizar melhor o botão para combinar com a imagem */
        .rounded-full.bg-indigo-400 {
          background-color: rgb(167, 139, 250);
        }
        
        .rounded-full.bg-indigo-400:hover {
          background-color: rgb(139, 92, 246);
        }
      `}</style>
    </Card>
  );
} 