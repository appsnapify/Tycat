'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, RotateCcw } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  qrCode: string;
  eventTitle: string;
  guestName: string;
  onReset: () => void;
}

export default function QRCodeDisplay({ qrCode, eventTitle, guestName, onReset }: QRCodeDisplayProps) {
  const [downloading, setDownloading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, qrCode, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          // Também gerar data URL para download
          const dataUrl = await QRCode.toDataURL(qrCode, {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrDataUrl(dataUrl);
        }
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [qrCode]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      if (qrDataUrl) {
        const link = document.createElement('a');
        link.download = `qr-${eventTitle.replace(/[^a-zA-Z0-9]/g, '-')}-${guestName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
        link.href = qrDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="text-center space-y-6">
      {/* Success Header */}
      <div className="space-y-2">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-2xl">✅</span>
        </div>
        <h3 className="text-xl font-bold text-white">
          Registo Confirmado!
        </h3>
        <p className="text-gray-300 text-sm">
          Olá <span className="text-white font-medium">{guestName}</span>
        </p>
      </div>

      {/* QR Code Section */}
      <div className="bg-white p-6 rounded-2xl inline-block">
        <canvas 
          ref={canvasRef}
          className="block mx-auto"
        />
      </div>

      {/* Event Info */}
      <div className="space-y-2">
        <h4 className="text-lg font-semibold text-white">
          {eventTitle}
        </h4>
        <p className="text-gray-300 text-sm">
          Guarda este QR Code! Será necessário na entrada do evento.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'A descarregar...' : 'Descarregar'}
          </Button>
          
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <Button
          onClick={onReset}
          variant="ghost"
          className="w-full text-gray-400 hover:text-white"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Registar Outro Telemóvel
        </Button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-4 text-left">
        <h5 className="font-semibold text-white mb-2">📱 Instruções:</h5>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Guarda este QR Code no teu telemóvel</li>
          <li>• Mostra-o na entrada do evento</li>
          <li>• Podes imprimir ou descarregar uma cópia</li>
          <li>• Em caso de problemas, contacta o promotor</li>
        </ul>
      </div>
    </div>
  );
}