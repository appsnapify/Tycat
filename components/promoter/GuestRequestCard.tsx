'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { isValidPhoneNumber } from 'libphonenumber-js';
import PhoneInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';

interface GuestRequestCardProps {
  eventId: string;
  promoterId: string;
  teamId: string;
  className?: string;
  hasAssociation?: boolean;
}

export function GuestRequestCard({
  eventId,
  promoterId,
  teamId,
  className = '',
  hasAssociation = false
}: GuestRequestCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Função para criar o registro do convidado
  const createGuestRecord = async () => {
    setError(null);

    if (!phone || !isValidPhoneNumber(phone)) {
      setError('Por favor, insira um número de telefone válido');
      toast.error('Por favor, insira um número de telefone válido');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('[DEBUG] Iniciando verificação do telefone:', phone);

      // Verificar se o número já está registrado para este evento
      const checkResponse = await fetch('/api/guests/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone,
          eventId,
          promoterId,
          teamId
        })
      });

      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        console.error('[ERROR] Erro na verificação:', errorData);
        throw new Error(errorData.message || 'Erro ao verificar registro');
      }

      const checkData = await checkResponse.json();
      console.log('[DEBUG] Resultado da verificação:', checkData);

      if (checkData.alreadyRegistered) {
        setError('Você já está registrado para este evento!');
        toast.info('Você já está registrado para este evento!');
        return;
      }

      // Se for um promotor do evento, não permitir registro
      if (checkData.isEventPromoter) {
        setError('Promotores não podem se registrar em eventos que promovem');
        toast.error('Promotores não podem se registrar em eventos que promovem');
        setPhone('');
        return;
      }

      console.log('[DEBUG] Iniciando criação do registro');
      // Criar o registro
      const response = await fetch('/api/guests/create-from-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          eventId,
          promoterId,
          teamId
        })
      });

      const data = await response.json();
      console.log('[DEBUG] Resposta da criação:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao criar registro');
      }

      toast.success('Registro realizado com sucesso! Em breve você receberá uma mensagem de confirmação.');
      setPhone('');
      setError(null);

    } catch (error) {
      console.error('[ERROR] Erro ao processar registro:', error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro. Por favor, tente novamente.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-xl">Registre-se para o evento</CardTitle>
        {!hasAssociation && (
          <p className="text-sm text-amber-600">
            ⚠️ Este link pode ter funcionalidades limitadas
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <PhoneInput
              international
              countryCallingCodeEditable={false}
              defaultCountry="PT"
              value={phone}
              onChange={(value) => {
                setPhone(value || '');
                setError(null);
              }}
              flags={flags}
              className={`flex h-10 w-full rounded-md border ${error ? 'border-red-500' : 'border-input'} bg-background px-3 py-2`}
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <Button 
            className="w-full" 
            onClick={createGuestRecord}
            disabled={isSubmitting || !phone}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Phone className="mr-2 h-4 w-4" />
                Registrar
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 