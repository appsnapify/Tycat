'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '@/hooks/useClientAuth';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { PhoneVerificationForm } from '@/components/client-auth/PhoneVerificationForm';
import ClientLoginForm from '@/components/client-auth/ClientLoginForm';
import ClientRegistrationForm from '@/components/client-auth/ClientRegistrationForm';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface GuestRequestClientButtonProps {
  eventId: string;
  promoterId: string;
  teamId: string;
  buttonText?: string;
  className?: string;
}

export function GuestRequestClientButton({
  eventId,
  promoterId,
  teamId,
  buttonText = 'Pedir Entrada',
  className = ''
}: GuestRequestClientButtonProps) {
  const router = useRouter();
  const { user, checkAuth } = useClientAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  
  // Estados para o QR code
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [eventDetails, setEventDetails] = useState<{title?: string, date?: string, location?: string}>({});
  
  const handleClick = async () => {
    // Se o usuário já estiver autenticado, submeter o pedido diretamente
    if (user) {
      submitRequest();
    } else {
      // Mostrar diálogo de autenticação
      setDialogOpen(true);
    }
  };
  
  // Função para gerar QR code melhorada com fallback
  const generateQRCode = async (guestId: string): Promise<string> => {
    try {
      console.log(`Gerando QR code para guestId: ${guestId}`);
      // Tentar primeiro com API externa
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=guest_${guestId}_event_${eventId}_${Date.now()}`;
      
      // Verificar se a URL é válida
      const testResponse = await fetch(qrCodeUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('QR code gerado com sucesso via API externa');
        return qrCodeUrl;
      }
      
      // Fallback 1: Tentar outra API de QR code
      console.log('Tentando fallback 1 para geração de QR code');
      return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=guest_${guestId}_event_${eventId}_${Date.now()}`;
    } catch (error) {
      console.error('Erro ao gerar QR code, usando fallback:', error);
      // Fallback 2: URL estática simples
      return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=guest_${guestId}_event_${eventId}_${Date.now()}`;
    }
  };
  
  // Verificar se a função RPC está disponível
  const checkRpcAvailability = async (supabase: any): Promise<boolean> => {
    try {
      // Tentar uma função RPC simples para verificar
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: "SELECT 1 as test"
      });
      
      if (error) {
        console.error('RPC exec_sql não está disponível:', error);
        return false;
      }
      
      console.log('RPC exec_sql está disponível');
      return true;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade da RPC:', error);
      return false;
    }
  };
  
  // Função para carregar detalhes do evento
  const loadEventDetails = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('events')
        .select('title, date, location')
        .eq('id', eventId)
        .single();
      
      if (error) {
        console.error('Erro ao carregar detalhes do evento:', error);
        return;
      }
      
      if (data) {
        setEventDetails({
          title: data.title,
          date: new Date(data.date).toLocaleDateString('pt-PT'),
          location: data.location
        });
        console.log('Detalhes do evento carregados com sucesso:', data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes do evento:', error);
    }
  };
  
  const submitRequest = async () => {
    setIsSubmitting(true);
    
    try {
      // Verificações detalhadas antes de prosseguir
      console.log('Iniciando submitRequest com os seguintes dados:', {
        userId: user?.id,
        eventId,
        promoterId,
        teamId
      });
      
      // Verificar se temos um usuário válido antes de prosseguir
      if (!user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      // Verificar se temos todos os IDs necessários
      if (!eventId) {
        throw new Error('ID do evento não fornecido');
      }
      
      if (!promoterId) {
        throw new Error('ID do promotor não fornecido');
      }
      
      if (!teamId) {
        throw new Error('ID da equipe não fornecido');
      }
      
      if (!user.firstName || !user.lastName) {
        throw new Error('Dados do usuário incompletos. Verifique seu perfil.');
      }
      
      // Carregar detalhes do evento para exibir com o QR code
      await loadEventDetails();
      
      // Criar cliente Supabase com tratamento de erros
      let supabase;
      try {
        supabase = createClient();
        console.log('Cliente Supabase criado com sucesso');
      } catch (supabaseError) {
        console.error('Erro ao criar cliente Supabase:', supabaseError);
        throw new Error('Não foi possível conectar ao serviço. Por favor, tente novamente mais tarde.');
      }
      
      // Verificar disponibilidade da RPC
      const rpcAvailable = await checkRpcAvailability(supabase);
      console.log('Disponibilidade da RPC:', rpcAvailable);
      
      // Verificar se o utilizador já tem um pedido para este evento
      console.log(`Verificando pedido existente para usuário ${user.id} no evento ${eventId}`);
      let existingRequest;
      let checkError;
      
      try {
        const result = await supabase
          .from('guests')
          .select('id, qr_code_url')
          .eq('event_id', eventId)
          .eq('client_user_id', user.id)
          .maybeSingle();
          
        existingRequest = result.data;
        checkError = result.error;
        
        console.log('Resultado da verificação:', { existingRequest, error: checkError });
      } catch (queryError) {
        console.error('Erro ao executar consulta:', queryError);
        checkError = queryError;
      }
      
      if (checkError) {
        console.error('Erro ao verificar pedido existente:', checkError);
        throw checkError;
      }
      
      let guestId: string;
      let qrCode: string;
      
      if (existingRequest) {
        // Se já existir um pedido, usar o QR code existente ou gerar um novo
        guestId = existingRequest.id;
        console.log('Pedido existente encontrado com ID:', guestId);
        
        if (existingRequest.qr_code_url) {
          qrCode = existingRequest.qr_code_url;
          console.log('Usando QR code existente');
        } else {
          console.log('Gerando novo QR code para pedido existente');
          qrCode = await generateQRCode(guestId);
          
          // Atualizar o registro com a URL do QR code
          console.log('Atualizando registro com QR code...');
          try {
            const updateResult = await supabase
              .from('guests')
              .update({ 
                qr_code_url: qrCode,
                status: 'approved' // Aprovar automaticamente quando vem do promotor
              })
              .eq('id', guestId);
            
            if (updateResult.error) {
              console.error('Erro detalhado ao atualizar registro:', updateResult.error);
              // Não lançar erro aqui para continuar com o processo
            } else {
              console.log('Registro atualizado com sucesso');
            }
          } catch (updateError) {
            console.error('Erro na operação de atualização:', updateError);
            // Não interromper o fluxo por causa de erro na atualização
          }
        }
      } else {
        // Criar novo pedido
        console.log('Criando novo pedido de convidado...');
        
        try {
          console.log('Inserindo novo registro com os seguintes dados:', {
            event_id: eventId,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            client_user_id: user.id,
            promoter_id: promoterId,
            team_id: teamId
          });
          
          let insertResult;
          try {
            insertResult = await supabase
              .from('guests')
              .insert({
                event_id: eventId,
                name: `${user.firstName} ${user.lastName}`,
                phone: user.phone,
                client_user_id: user.id,
                promoter_id: promoterId,
                team_id: teamId,
                status: 'approved' // Aprovar automaticamente quando vem do promotor
              })
              .select('id')
              .single();
          } catch (insertError) {
            console.error('Erro ao executar inserção:', insertError);
            throw new Error('Falha na inserção do pedido');
          }
          
          if (insertResult.error) {
            console.error('Erro detalhado ao criar pedido:', insertResult.error);
            throw new Error(`Falha ao criar pedido: ${insertResult.error.message}`);
          } 
          
          if (!insertResult.data) {
            throw new Error('Falha ao criar pedido: retorno vazio');
          }
          
          guestId = insertResult.data.id;
          console.log('Pedido criado com sucesso, ID:', guestId);
          
          // Gerar QR code
          qrCode = await generateQRCode(guestId);
          console.log('QR code gerado:', qrCode);
          
          // Atualizar o registro com a URL do QR code
          console.log('Atualizando registro com QR code...');
          try {
            const updateResult = await supabase
              .from('guests')
              .update({ qr_code_url: qrCode })
              .eq('id', guestId);
            
            if (updateResult.error) {
              console.error('Erro ao atualizar QR code:', updateResult.error);
              // Não lançar erro aqui, pois já temos o ID do convidado e o QR code
            } else {
              console.log('QR code atualizado com sucesso');
            }
          } catch (updateError) {
            console.error('Erro ao atualizar com QR code:', updateError);
            // Não interromper o fluxo por causa de erro na atualização
          }
        } catch (insertError) {
          console.error('Erro na operação de inserção:', insertError);
          throw insertError;
        }
      }
      
      // Atualizar o estado com a URL do QR code e mostrar o diálogo
      setQrCodeUrl(qrCode);
      setShowQRCode(true);
      
      toast.success('Acesso aprovado! Seu QR code está pronto.');
      
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
  
  const handlePhoneVerified = async (phoneNumber: string, exists: boolean) => {
    setPhone(phoneNumber);
    // Determinar próximo passo com base na existência do utilizador
    setAuthStep(exists ? 'login' : 'register');
  };
  
  const handleLoginSuccess = async () => {
    setDialogOpen(false);
    
    // Adicionar um pequeno delay para permitir que a sessão seja atualizada
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fazer três tentativas de obter os dados do usuário após o login
    let updatedUser = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!updatedUser && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentativa ${attempts} de obter dados do usuário após login`);
      
      updatedUser = await checkAuth();
      
      if (!updatedUser && attempts < maxAttempts) {
        // Esperar um pouco mais antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Somente prosseguir com o pedido se o checkAuth retornar um usuário válido
    if (updatedUser) {
      submitRequest();
    } else {
      toast.error('Não foi possível obter os dados do usuário. Por favor, tente novamente.');
    }
  };
  
  const handleRegistrationSuccess = async () => {
    setDialogOpen(false);
    
    // Adicionar um delay maior após o registro para permitir que tudo seja processado
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fazer três tentativas de obter os dados do usuário após o registro
    let updatedUser = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (!updatedUser && attempts < maxAttempts) {
      attempts++;
      console.log(`Tentativa ${attempts} de obter dados do usuário após registro`);
      
      updatedUser = await checkAuth();
      
      if (!updatedUser && attempts < maxAttempts) {
        // Esperar um pouco mais antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    // Somente prosseguir com o pedido se o checkAuth retornar um usuário válido
    if (updatedUser) {
      submitRequest();
    } else {
      toast.error('Não foi possível obter os dados do usuário após o registro. Por favor, tente fazer login.');
    }
  };
  
  return (
    <>
      <Button 
        onClick={handleClick} 
        disabled={isSubmitting}
        className={className}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            A processar...
          </>
        ) : (
          buttonText
        )}
      </Button>
      
      {/* Dialog para autenticação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full max-w-md p-0 mx-auto max-h-[80vh] overflow-y-auto">
          <DialogTitle className="sr-only">Acesso à Guest List</DialogTitle>
          
          {authStep === 'phone' && (
            <PhoneVerificationForm onVerified={handlePhoneVerified} />
          )}
          
          {authStep === 'login' && (
            <ClientLoginForm 
              phone={phone} 
              onSuccess={handleLoginSuccess} 
              onBack={() => setAuthStep('phone')} 
            />
          )}
          
          {authStep === 'register' && (
            <div className="py-1 px-2">
              <ClientRegistrationForm 
                phone={phone} 
                onSuccess={handleRegistrationSuccess}
                onBack={() => setAuthStep('phone')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Dialog para exibir QR code */}
      <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
        <DialogContent className="w-full max-w-md p-6 mx-auto text-center">
          <DialogTitle className="text-xl font-bold mb-1">Ingresso Confirmado!</DialogTitle>
          <DialogDescription className="mb-4">
            Acesso garantido para {eventDetails.title || 'o evento'}
          </DialogDescription>
          
          <div className="my-4">
            {eventDetails.date && (
              <p className="text-sm text-muted-foreground mb-1">Data: {eventDetails.date}</p>
            )}
            {eventDetails.location && (
              <p className="text-sm text-muted-foreground mb-4">Local: {eventDetails.location}</p>
            )}
            
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg shadow-md mx-auto max-w-xs">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code de Acesso" 
                  className="w-full h-auto"
                />
                <p className="text-xs mt-2 text-muted-foreground">
                  Apresente este QR code na entrada do evento
                </p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 justify-between mt-6">
            <Button variant="outline" onClick={() => router.push('/client/dashboard')}>
              Ver Meus Ingressos
            </Button>
            <Button onClick={() => setShowQRCode(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 