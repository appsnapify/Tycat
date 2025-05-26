'use client';

import { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { validateGuestQRCode } from '@/app/actions/promo';
import { toast } from 'sonner';

interface QRCodeScannerProps {
  onValidQRCode: (data: any) => void;
}

export function QRCodeScanner({ onValidQRCode }: QRCodeScannerProps) {
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // Inicializar o scanner
    const qrcodeScanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      },
      false
    );

    setScanner(qrcodeScanner);

    // Função de sucesso
    const onScanSuccess = async (decodedText: string) => {
      try {
        // Validar o QR code
        const { isValid, error } = await validateGuestQRCode(decodedText);
        
        if (error) {
          toast.error('Erro ao validar QR code');
          return;
        }

        if (!isValid) {
          toast.error('QR code inválido ou expirado');
          return;
        }

        // Se válido, decodificar os dados
        const qrData = JSON.parse(decodedText);
        onValidQRCode(qrData);
        
        // Feedback visual
        toast.success('QR code válido!');

      } catch (error) {
        console.error('Erro ao processar QR code:', error);
        toast.error('Erro ao processar QR code');
      }
    };

    // Função de erro
    const onScanError = (error: any) => {
      // Ignorar erros de não detecção
      if (error?.name === 'NotFoundException') {
        return;
      }
      console.error('Erro no scanner:', error);
    };

    // Iniciar o scanner
    qrcodeScanner.render(onScanSuccess, onScanError);

    // Cleanup
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [onValidQRCode]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div id="qr-reader" className="rounded-lg overflow-hidden shadow-lg" />
      <p className="text-sm text-gray-500 mt-2 text-center">
        Posicione o QR code no centro da câmera
      </p>
    </div>
  );
} 