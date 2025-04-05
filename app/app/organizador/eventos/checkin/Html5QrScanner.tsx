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
  const [isMobile, setIsMobile] = useState(false);
  
  // Detectar se é dispositivo móvel
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|windows phone/.test(ua);
      setIsMobile(isMobileDevice);
      console.log("Tipo de dispositivo:", isMobileDevice ? "Móvel" : "Desktop");
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
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
        
        // Inicializar o scanner
        console.log("Iniciando scanner de QR code...");
        scannerRef.current = new Html5Qrcode(scannerId, { 
          verbose: true, // Ativar logs detalhados para debugging
          formatsToSupport: [
            Html5Qrcode.FORMATS.QR_CODE,
            Html5Qrcode.FORMATS.DATA_MATRIX,
            Html5Qrcode.FORMATS.CODE_39,
            Html5Qrcode.FORMATS.CODE_93
          ]
        });
        
        // Definir o tamanho baseado no tipo de dispositivo
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        console.log(`Dimensões do container: ${containerWidth}x${containerHeight}px`);
        
        // Calcular dimensões otimizadas para cada tipo de dispositivo
        // Usar tamanho menor para melhorar a detecção
        let qrboxSize = {
          width: Math.min(200, containerWidth - 40),
          height: Math.min(200, containerHeight - 40)
        };
        
        // Em dispositivos móveis, usar uma área de escaneamento maior
        if (isMobile) {
          qrboxSize = {
            width: Math.min(250, containerWidth - 20), 
            height: Math.min(250, containerHeight - 20)
          };
        }
        
        console.log("Tamanho da área de escaneamento:", qrboxSize);
        
        // Tentar listar câmeras disponíveis
        try {
          const devices = await Html5Qrcode.getCameras();
          console.log("Câmeras disponíveis:", devices);
          
          if (devices && devices.length === 0) {
            console.warn("Nenhuma câmera encontrada!");
          }
        } catch (err) {
          console.error("Erro ao listar câmeras:", err);
        }
        
        // Iniciar a câmera com configurações otimizadas para detecção
        console.log("Iniciando câmera com configurações:", {
          facingMode: 'environment',
          fps: isMobile ? 15 : 10,
          qrbox: qrboxSize,
          aspectRatio: isMobile ? 4/3 : 1.0
        });
        
        await scannerRef.current.start(
          { facingMode: 'environment' },  // Apenas uma propriedade aqui
          {
            fps: isMobile ? 15 : 10, // Reduzir FPS para processamento mais preciso
            qrbox: qrboxSize,
            disableFlip: false,
            aspectRatio: isMobile ? 4/3 : 1.0, // Movido para cá
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            rememberLastUsedCamera: true,
          },
          (decodedText) => {
            console.log("[QR-SCANNER] SUCESSO! Código detectado:", decodedText);
            if (decodedText && decodedText.trim().length > 0) {
              // Vibrar em dispositivos móveis quando detectar um código (opcional)
              if (isMobile && navigator.vibrate) {
                navigator.vibrate(200);
              }
              
              // Aqui garantimos que onScan recebe um texto não-vazio
              const trimmedText = decodedText.trim();
              console.log("[QR-SCANNER] Enviando para processamento:", trimmedText);
              onScan({ text: trimmedText });
            } else {
              console.warn("[QR-SCANNER] Código detectado vazio");
            }
          },
          (errorMessage) => {
            // Log apenas dos erros de decodificação (não críticos)
            console.debug("[QR-SCANNER] Erro de decodificação:", errorMessage);
          }
        );
        
        // Garantir que o elemento de vídeo tenha estilo adequado
        setTimeout(() => {
          const videoElement = document.querySelector('#html5-qr-code-scanner video');
          if (videoElement) {
            console.log("[QR-SCANNER] Ajustando estilo do elemento de vídeo");
            
            const videoStyle = (videoElement as HTMLElement).style;
            videoStyle.width = '100%';
            videoStyle.height = 'auto';
            videoStyle.maxHeight = isMobile ? '100%' : '300px';
            videoStyle.objectFit = 'cover';
            
            // Remover transformações que podem afetar a detecção
            videoStyle.transform = ''; // Remover espelhamento que pode afetar a leitura
            
          } else {
            console.warn("[QR-SCANNER] Elemento de vídeo não encontrado");
          }
          
          // Verificar se o scanner está ativo
          if (scannerRef.current) {
            console.log("[QR-SCANNER] Estado do scanner:", scannerRef.current.isScanning ? "ativo" : "inativo");
          }
          
          // Instrução para o usuário
          console.log("[QR-SCANNER] INSTRUÇÕES: Aponte a câmera diretamente para o QR code, mantendo-o centralizado e a uma distância de 10-20cm.");
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
          } else {
            console.log("Scanner não está ativo, não é necessário parar");
          }
        } catch (err) {
          console.error("Erro ao verificar estado do scanner:", err);
        }
      }
    };
  }, [onScan, onError, isMobile]);
  
  return (
    <div className={`qr-scanner-container ${isMobile ? 'qr-scanner-mobile' : ''}`}>
      {isInitializing && (
        <div className="scanner-loading">
          Inicializando câmera...
        </div>
      )}
      <div ref={containerRef} className="scanner-area" />
      
      <style jsx>{`
        .qr-scanner-container {
          width: 100%;
          min-height: 350px;
          position: relative;
          overflow: hidden;
        }
        
        .qr-scanner-mobile {
          min-height: 85vh;
          border-radius: 12px;
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
        
        .qr-scanner-mobile .scanner-area {
          min-height: 85vh;
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
        
        /* Garantir que o vídeo seja visível */
        :global(#html5-qr-code-scanner) {
          width: 100% !important;
          height: 100% !important;
          min-height: 300px !important;
        }
        
        :global(#html5-qr-code-scanner video) {
          width: 100% !important;
          height: auto !important;
          max-height: 300px !important;
          object-fit: contain !important;
        }
        
        /* Ajustes mobile */
        .qr-scanner-mobile :global(#html5-qr-code-scanner) {
          min-height: 85vh !important;
        }
        
        .qr-scanner-mobile :global(#html5-qr-code-scanner video) {
          max-height: 85vh !important;
          object-fit: cover !important;
        }
        
        /* Melhorar a visibilidade da área de escaneamento */
        :global(.qr-border) {
          border: 5px solid #4f46e5 !important;
          box-shadow: 0 0 0 5px rgba(79, 70, 229, 0.3) !important;
        }
        
        .qr-scanner-mobile :global(.qr-border) {
          border: 8px solid #4f46e5 !important;
        }
      `}</style>
    </div>
  );
} 