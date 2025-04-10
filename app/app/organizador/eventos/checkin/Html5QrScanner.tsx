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
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  useEffect(() => {
    // Verificar permissões da câmera no início
    const checkCameraPermission = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        
        console.log(`Detectadas ${cameras.length} câmeras:`, cameras);
        
        if (cameras.length === 0) {
          console.log("Nenhuma câmera detectada no dispositivo!");
          setHasCameraPermission(false);
          if (onError) onError(new Error("Nenhuma câmera detectada no dispositivo"));
          return false;
        }
        
        // Tentar obter acesso à câmera
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Liberar recursos
        stream.getTracks().forEach(track => track.stop());
        
        console.log("Permissão para câmera CONCEDIDA");
        setHasCameraPermission(true);
        return true;
      } catch (error) {
        console.error("Erro ao verificar permissões da câmera:", error);
        setHasCameraPermission(false);
        if (onError) onError(error);
        return false;
      }
    };
    
    checkCameraPermission();
  }, [onError]);
  
  useEffect(() => {
    // Criar e inicializar o scanner
    const initializeScanner = async () => {
      // Não iniciar se não temos permissão de câmera ou se o container não existe
      if (hasCameraPermission === false || !containerRef.current) {
        console.log("Não é possível inicializar o scanner: permissão ou container ausente");
        return;
      }
      
      // Apenas inicializar quando soubermos sobre a permissão
      if (hasCameraPermission === null) {
        console.log("Aguardando verificação de permissão da câmera...");
        return;
      }
    
      try {
        setIsInitializing(true);
        
        // Identificador único para o scanner
        const scannerId = 'html5-qr-code-scanner';
        
        console.log("Limpando qualquer scanner existente...");
        // Limpar qualquer scanner existente
        if (scannerRef.current && scannerRef.current.isScanning) {
          await scannerRef.current.stop();
          console.log("Scanner anterior parado com sucesso");
        }
        
        const existingElement = document.getElementById(scannerId);
        if (existingElement) {
          existingElement.remove();
          console.log("Elemento anterior removido");
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
        
        // Listar câmeras disponíveis
        try {
          const devices = await Html5Qrcode.getCameras();
          console.log(`Câmeras disponíveis (${devices.length}):`, devices);
          
          if (devices.length === 0) {
            console.warn("Nenhuma câmera encontrada via Html5Qrcode.getCameras()!");
          }
        } catch (err) {
          console.error("Erro ao listar câmeras:", err);
        }
        
        // Obter tamanho do container
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        console.log(`Dimensões do container: ${containerWidth}x${containerHeight}px`);
        
        // Calcular qrbox com tamanho fixo seguro
        const qrboxSize = {
          width: Math.min(220, containerWidth - 50),
          height: Math.min(220, containerHeight - 50)
        };
        console.log("Usando tamanho de qrbox:", qrboxSize);
        
        console.log("Iniciando câmera com configurações simplificadas");
        
        // Iniciar com configurações mínimas
        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: qrboxSize,
            formatsToSupport: [Html5Qrcode.FORMATS.QR_CODE]
          },
          (decodedText) => {
            console.log("QR Code detectado com sucesso:", decodedText);
            
            // Garantir que o callback receba um texto válido
            if (decodedText && decodedText.trim().length > 0) {
              onScan({ text: decodedText.trim() });
            } else {
              console.warn("QR Code detectado mas texto está vazio");
            }
          },
          (errorMessage) => {
            console.debug("Erro de decodificação (não crítico):", errorMessage);
          }
        );
        
        // Garantir que o elemento de vídeo tenha estilo adequado
        setTimeout(() => {
          const videoElement = document.querySelector('#html5-qr-code-scanner video');
          if (videoElement) {
            console.log("Ajustando estilo do elemento de vídeo");
            const video = videoElement as HTMLElement;
            video.style.width = '100%';
            video.style.height = 'auto';
            video.style.maxHeight = '80vh';
            video.style.objectFit = 'contain';
            
            // Verificar se o vídeo está realmente visível
            const computedStyle = window.getComputedStyle(video);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
              console.error("ATENÇÃO: O elemento de vídeo está invisível!");
            } else {
              console.log("Elemento de vídeo está visível");
            }
            
            // Verificar dimensões do vídeo
            console.log(`Dimensões do vídeo: ${video.clientWidth}x${video.clientHeight}`);
          } else {
            console.error("ERRO: Elemento de vídeo não encontrado! Isso indica um problema crítico.");
          }
          
          // Adicionar classe para estilizar via CSS
          const scannerDiv = document.getElementById(scannerId);
          if (scannerDiv) {
            scannerDiv.classList.add('qr-scanner-container');
            console.log("Classe adicionada ao scanner");
          }
          
          // Verificar se o scanner está realmente ativo
          if (scannerRef.current) {
            console.log("Estado do scanner:", scannerRef.current.isScanning ? "ATIVO" : "INATIVO");
            
            if (!scannerRef.current.isScanning) {
              console.error("ERRO CRÍTICO: Scanner não está ativo após inicialização!");
              setIsInitializing(false);
              if (onError) onError(new Error("Falha ao iniciar scanner, verifique console"));
              return;
            }
          }
        }, 1000);
        
        console.log("Scanner QR iniciado com sucesso");
        setIsInitializing(false);
      } catch (error) {
        console.error("ERRO FATAL ao inicializar scanner de QR code:", error);
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
  }, [onScan, onError, hasCameraPermission]);
  
  return (
    <div className="scanner-root">
      {isInitializing && (
        <div className="scanner-loading">
          Inicializando câmera...
        </div>
      )}
      
      {hasCameraPermission === false && (
        <div className="camera-error">
          <p>Não foi possível acessar a câmera.</p>
          <p>Por favor, verifique se concedeu permissão de câmera para este site.</p>
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
        
        .camera-error {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #fff0f0;
          color: #d00;
          z-index: 10;
          text-align: center;
          padding: 1rem;
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