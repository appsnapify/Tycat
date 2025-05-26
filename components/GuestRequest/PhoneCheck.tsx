import { useState } from 'react';
import { z } from 'zod';

const phoneSchema = z.object({
  phone: z.string()
    .min(10, "Telefone deve ter pelo menos 10 dígitos")
    .max(15, "Telefone muito longo")
    .regex(/^\+?[1-9]\d{9,14}$/, "Formato de telefone inválido")
});

export function PhoneCheck() {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'password' | 'register'>('phone');

  const validatePhone = (phone: string) => {
    try {
      phoneSchema.parse({ phone });
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      }
      return false;
    }
  };

  const checkPhone = async () => {
    setError('');
    
    if (!validatePhone(phone)) {
      return;
    }

    try {
      const response = await fetch('/api/client-auth/check-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Erro ao verificar telefone');
        return;
      }

      // Atualizar o passo baseado na resposta do servidor
      setStep(data.nextStep);

    } catch (err) {
      setError('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="space-y-4">
      {step === 'phone' && (
        <>
          <div className="flex flex-col space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">
              Número de telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError('');
              }}
              className="px-3 py-2 border rounded-md"
              placeholder="+55 (11) 99999-9999"
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <button
            onClick={checkPhone}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Continuar
          </button>
        </>
      )}

      {step === 'password' && (
        <LoginForm phone={phone} onBack={() => setStep('phone')} />
      )}

      {step === 'register' && (
        <RegistrationForm phone={phone} onBack={() => setStep('phone')} />
      )}
    </div>
  );
} 