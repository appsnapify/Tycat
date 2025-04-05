'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Html5QrScannerProps {
  onScan: (result: { text: string }) => void;
  onError?: (error: any) => void;
}

export default function Html5QrScanner({ onScan, onError }: Html5QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  useEffect(() => {
    // Criar e inicializar o scanner
    const initializeScanner = async () => {
      if (!containerRef.current) return;
    
      try {
        setIsInitializing(true);
        
        // Identificador único para o scanner
        const scannerId = 'html5-qr-code-scanner';
        
        // Limpar qualquer scanner existente
        const existingElement = document.getElementById(scannerId);
        if (existingElement) {
          existingElement.remove();
        }
        
        // Criar novo container para o scanner
        const container = document.createElement('div');
        container.id = scannerId;
        container.style.width = '100%';
        container.style.height = '100%';
        containerRef.current.innerHTML = ''; // Limpar completamente o container
        containerRef.current.appendChild(container);
        
        // Versão mais simples e direta do scanner
        console.log("Iniciando scanner de QR code...");
        scannerRef.current = new Html5Qrcode(scannerId);
        
        // Obter tamanho do container
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calcular qrbox com tamanho fixo seguro
        const qrboxSize = {
          width: Math.min(250, containerWidth - 50),
          height: Math.min(250, containerHeight - 50)
        };
        
        console.log("Iniciando câmera com configurações simplificadas");
        
        // Iniciar com configurações mínimas
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: qrboxSize
          },
          (decodedText) => {
            console.log("QR Code detectado:", decodedText);
            onScan({ text: decodedText.trim() });
          },
          (errorMessage) => {
            console.debug("Erro de decodificação:", errorMessage);
          }
        );
        
        // Garantir que o elemento de vídeo tenha estilo adequado
        setTimeout(() => {
          const videoElement = document.querySelector('#html5-qr-code-scanner video');
          if (videoElement) {
            const video = videoElement as HTMLElement;
            video.style.width = '100%';
            video.style.height = 'auto';
            video.style.maxHeight = '80vh';
            video.style.objectFit = 'contain';
          }
          
          // Adicionar classe para estilizar via CSS
          const scannerDiv = document.getElementById(scannerId);
          if (scannerDiv) {
            scannerDiv.classList.add('qr-scanner-container');
          }
        }, 500);
        
        console.log("Scanner QR iniciado com sucesso");
        setIsInitializing(false);
      } catch (error) {
        console.error("Erro ao inicializar scanner de QR code:", error);
        setIsInitializing(false);
        if (onError) onError(error);
      }
    };
    
    initializeScanner();
    
    // Cleanup ao desmontar
    return () => {
      if (scannerRef.current) {
        try {
          // Verificar se o scanner está ativo antes de tentar pará-lo
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
              .then(() => console.log("Scanner QR parado com sucesso"))
              .catch(err => console.error("Erro ao parar scanner:", err));
          }
        } catch (err) {
          console.error("Erro ao verificar estado do scanner:", err);
        }
      }
    };
  }, [onScan, onError]);
  
  return (
    <div className="scanner-root">
      {isInitializing && (
        <div className="scanner-loading">
          Inicializando câmera...
        </div>
      )}
      <div ref={containerRef} className="scanner-area" />
      
      <style jsx>{`
        .scanner-root {
          width: 100%;
          height: 100%;
          min-height: 350px;
          position: relative;
          overflow: hidden;
        }
        
        .scanner-area {
          width: 100%;
          height: 100%;
          min-height: 350px;
          background-color: #f8f8f8;
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .scanner-loading {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(255, 255, 255, 0.8);
          z-index: 10;
          font-weight: 500;
        }
        
        /* Estilos globais aplicados a elementos do scanner */
        :global(#html5-qr-code-scanner) {
          width: 100% !important;
          height: 100% !important;
          min-height: 300px !important;
        }
        
        :global(#html5-qr-code-scanner video) {
          width: 100% !important;
          height: auto !important;
          max-height: 80vh !important;
          object-fit: contain !important;
        }
        
        /* Melhorar a visibilidade da área de escaneamento */
        :global(.qr-border) {
          border: 5px solid #4f46e5 !important;
          box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.3) !important;
        }
      `}</style>
    </div>
  );
} 