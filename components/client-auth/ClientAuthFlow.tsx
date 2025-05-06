import { useState } from 'react';
import { PhoneVerificationForm } from './PhoneVerificationForm';
import ClientLoginForm from './ClientLoginForm';
import ClientRegistrationForm from './ClientRegistrationForm';

type FlowStep = 'phone-verification' | 'login' | 'register';

interface ClientAuthFlowProps {
  onComplete: (userData: any) => void;
  initialPhone?: string;
}

export function ClientAuthFlow({ onComplete, initialPhone = '' }: ClientAuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<FlowStep>('phone-verification');
  const [phone, setPhone] = useState(initialPhone);
  const [userId, setUserId] = useState<string | null>(null);
  
  const handlePhoneVerified = (phoneNumber: string, exists: boolean, phoneUserId: string | null = null) => {
    console.log('Telefone verificado:', phoneNumber, 'Existe:', exists, 'UserId:', phoneUserId);
    setPhone(phoneNumber);
    setUserId(phoneUserId);
    
    // Decide o próximo passo baseado na existência do telefone
    if (exists) {
      setCurrentStep('login');
    } else {
      setCurrentStep('register');
    }
  };
  
  const handleLoginSuccess = (userData: any) => {
    onComplete({
      ...userData,
      isNewUser: false
    });
  };
  
  const handleRegistrationSuccess = (result: any) => {
    onComplete({
      ...result,
      isNewUser: true
    });
  };
  
  const handleBack = () => {
    setCurrentStep('phone-verification');
  };
  
  return (
    <div className="flex justify-center items-center w-full">
      {currentStep === 'phone-verification' && (
        <PhoneVerificationForm
          onVerified={handlePhoneVerified}
          defaultPhone={phone}
        />
      )}
      
      {currentStep === 'login' && (
        <ClientLoginForm
          onSuccess={handleLoginSuccess}
          onBack={handleBack}
          phone={phone}
          userId={userId}
        />
      )}
      
      {currentStep === 'register' && (
        <ClientRegistrationForm
          onSuccess={handleRegistrationSuccess}
          onBack={handleBack}
          phone={phone}
        />
      )}
    </div>
  );
} 