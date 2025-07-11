'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PhoneVerificationForm } from '@/components/client-auth/PhoneVerificationForm';
import ClientLoginForm from '@/components/client-auth/ClientLoginForm';
import ClientRegistrationForm from '@/components/client-auth/ClientRegistrationForm';
import { useClientAuth } from '@/hooks/useClientAuth';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
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
  buttonText = 'Entrar com o Telemóvel',
  className = ''
}: GuestRequestClientButtonProps) {
  const { user, checkAuth } = useClientAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authStep, setAuthStep] = useState<'phone' | 'login' | 'register'>('phone');
  const [phone, setPhone] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [eventDetails, setEventDetails] = useState<{title?: string, date?: string, location?: string}>({});

  const handleClick = async () => {
    if (user) {
      submitRequest();
    } else {
      setDialogOpen(true);
    }
  };

  const generateQRCode = async (guestId: string): Promise<string> => {
    try {
      console.log(`Gerando QR code para guestId: ${guestId}`);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=guest_${guestId}_event_${eventId}_${Date.now()}`;
      
      const testResponse = await fetch(qrCodeUrl, { method: 'HEAD' });
      if (testResponse.ok) {
        console.log('QR code gerado com sucesso via API externa');
        return qrCodeUrl;
      }
      
      console.log('Tentando fallback 1 para geração de QR code');
      return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=guest_${guestId}_event_${eventId}_${Date.now()}`;
    } catch (error) {
      console.error('Erro ao gerar QR code, usando fallback:', error);
      return `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=guest_${guestId}_event_${eventId}_${Date.now()}`;
    }
  };

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
      console.log('Iniciando submitRequest com os seguintes dados:', {
        userId: user?.id,
        eventId,
        promoterId,
        teamId
      });
      
      if (!user) {
        throw new Error('Usuário não autenticado. Por favor, faça login novamente.');
      }
      
      if (!eventId || !promoterId || !teamId) {
        throw new Error('Dados incompletos para o pedido');
      }
      
      if (!user.firstName || !user.lastName) {
        throw new Error('Dados do usuário incompletos. Verifique seu perfil.');
      }
      
      await loadEventDetails();
      
      const supabase = createClient();
      
      console.log(`Verificando pedido existente para usuário ${user.id} no evento ${eventId}`);
      const { data: existingRequest, error: checkError } = await supabase
        .from('guests')
        .select('id, qr_code_url')
        .eq('event_id', eventId)
        .eq('client_user_id', user.id)
        .maybeSingle();
      
      if (checkError) {
        throw checkError;
      }
      
      let guestId: string;
      let qrCode: string;
      
      if (existingRequest) {
        guestId = existingRequest.id;
        console.log('Pedido existente encontrado com ID:', guestId);
        
        if (existingRequest.qr_code_url) {
          qrCode = existingRequest.qr_code_url;
          console.log('Usando QR code existente');
        } else {
          console.log('Gerando novo QR code para pedido existente');
          qrCode = await generateQRCode(guestId);
          
          const { error: updateError } = await supabase
            .from('guests')
            .update({ 
              qr_code_url: qrCode,
              status: 'approved'
            })
            .eq('id', guestId);
          
          if (updateError) {
            console.error('Erro ao atualizar QR code:', updateError);
          }
        }
      } else {
        console.log('Criando novo pedido de convidado...');
        
        const { data: newGuest, error: insertError } = await supabase
          .from('guests')
          .insert({
            event_id: eventId,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            client_user_id: user.id,
            promoter_id: promoterId,
            team_id: teamId,
            status: 'approved'
          })
          .select()
          .single();
        
        if (insertError || !newGuest) {
          throw insertError || new Error('Falha ao criar pedido');
        }
        
        guestId = newGuest.id;
        qrCode = await generateQRCode(guestId);
        
        const { error: updateError } = await supabase
          .from('guests')
          .update({ qr_code_url: qrCode })
          .eq('id', guestId);
        
        if (updateError) {
          console.error('Erro ao salvar QR code:', updateError);
        }
      }
      
      setQrCodeUrl(qrCode);
      setShowQRCode(true);
      toast.success('Pedido processado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao processar pedido:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhoneVerified = async (phoneNumber: string, exists: boolean) => {
    setPhone(phoneNumber);
    setAuthStep(exists ? 'login' : 'register');
  };

  const handleLoginSuccess = async () => {
    const authCheck = await checkAuth();
    if (authCheck) {
      setDialogOpen(false);
      submitRequest();
    }
  };

  const handleRegistrationSuccess = async () => {
    const authCheck = await checkAuth();
    if (authCheck) {
      setDialogOpen(false);
      submitRequest();
    }
  };
  
  return (
    <>
            <Button 
        onClick={handleClick}
          disabled={isSubmitting}
        className={`bg-[#6366f1] hover:bg-[#4f46e5] text-white ${className}`}
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center">
            {authStep === 'phone' && 'Verificar Telemóvel'}
            {authStep === 'login' && 'Entrar'}
            {authStep === 'register' && 'Criar Conta'}
          </DialogTitle>
            
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
                <ClientRegistrationForm 
                  phone={phone} 
              onSuccess={handleRegistrationSuccess}
                  onBack={() => setAuthStep('phone')}
                />
            )}
          </DialogContent>
        </Dialog>
    </>
  );
} 