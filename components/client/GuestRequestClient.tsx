import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import PhoneVerificationForm from './PhoneVerificationForm';
import ClientLoginForm from './ClientLoginForm';
import ClientRegistrationForm from './ClientRegistrationForm';
import SuccessMessage from '@/components/ui/success-message';

interface GuestRequestClientProps {
  eventId: string;
  promoterId?: string;
  teamId?: string;
}

type Step = 'PHONE' | 'LOGIN' | 'REGISTER' | 'SUCCESS';

export default function GuestRequestClient({ 
  eventId, 
  promoterId, 
  teamId 
}: GuestRequestClientProps) {
  const [step, setStep] = useState<Step>('PHONE');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();
  
  const checkPhone = async (phoneNumber: string) => {
    try {
      setPhone(phoneNumber);
      
      const res = await fetch('/api/client-auth/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      
      if (!res.ok) {
        throw new Error('Falha ao verificar telefone');
      }
      
      const { success, exists } = await res.json();
      
      if (!success) {
        throw new Error('Erro na verificação do telefone');
      }
      
      // Definir próximo passo com base no resultado
      setStep(exists ? 'LOGIN' : 'REGISTER');
    } catch (error) {
      console.error('Erro na verificação do telefone:', error);
      
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível verificar o telefone. Tente novamente.'
      });
    }
  };
  
  const handleLoginSuccess = async () => {
    try {
      await createGuestRequest();
    } catch (error) {
      console.error('Erro após login:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível completar sua solicitação de guest list.'
      });
    }
  };
  
  const handleRegisterSuccess = async () => {
    try {
      await createGuestRequest();
    } catch (error) {
      console.error('Erro após registro:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível completar sua solicitação de guest list.'
      });
    }
  };
  
  const createGuestRequest = async () => {
    try {
      const res = await fetch('/api/guests/create-from-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: eventId,
          promoter_id: promoterId,
          team_id: teamId
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao criar solicitação');
      }
      
      setStep('SUCCESS');
    } catch (error) {
      console.error('Erro ao criar solicitação de guest list:', error);
      throw error;
    }
  };
  
  const handleBack = () => {
    setStep('PHONE');
  };
  
  return (
    <div className="guest-request-container mt-8">
      {step === 'PHONE' && (
        <PhoneVerificationForm onSubmit={checkPhone} />
      )}
      
      {step === 'LOGIN' && (
        <ClientLoginForm 
          phone={phone} 
          onSuccess={handleLoginSuccess}
          onBack={handleBack}
        />
      )}
      
      {step === 'REGISTER' && (
        <ClientRegistrationForm 
          phone={phone}
          onSuccess={handleRegisterSuccess}
          onBack={handleBack}
        />
      )}
      
      {step === 'SUCCESS' && (
        <SuccessMessage 
          title="Solicitação confirmada!"
          description="Seu QR code está disponível no seu dashboard."
          actionText="Acessar meu QR code"
          actionHref="/user/dashboard"
        />
      )}
    </div>
  );
} 