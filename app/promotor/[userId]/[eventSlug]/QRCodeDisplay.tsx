'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Printer, Check } from 'lucide-react';
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
      <div className="space-y-3">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Check className="w-8 h-8 text-white" strokeWidth={3} />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-800">
            Registo Confirmado!
          </h3>
          <p className="text-slate-600 text-sm">
            Olá <span className="text-slate-800 font-medium">{guestName}</span>
          </p>
        </div>
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
        <h4 className="text-lg font-semibold text-slate-800">
          {eventTitle}
        </h4>
        <p className="text-slate-600 text-sm">
          Guarda este QR Code! Será necessário na entrada do evento.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloading ? 'A descarregar...' : 'Descarregar'}
          </Button>
          
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-medium py-3 rounded-xl transition-colors"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>
    </div>
  );
}