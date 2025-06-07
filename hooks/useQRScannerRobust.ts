import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import jsQR from 'jsqr'

interface QRScannerConfig {
  eventId: string
  onScan: (qrCode: string) => void
  fallbackEnabled?: boolean
}

interface QRScannerState {
  isScanning: boolean
  strategy: 'html5qrcode' | 'webrtc-native' | null
  error: string | null
  cameraPermission: 'granted' | 'denied' | 'prompt'
  initializationStatus: 'pending' | 'initializing' | 'ready' | 'error'
}

// Configurações uniformizadas para ambas estratégias
const SCANNER_CONFIG = {
  fps: 8,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.0,
  resolution: {
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
}

// Função auxiliar para detectar se é dispositivo móvel
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    typeof navigator !== 'undefined' ? navigator.userAgent : ''
  )
}

export const useQRScannerRobust = ({ eventId, onScan, fallbackEnabled = true }: QRScannerConfig) => {
  // Refs para elementos e estado
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isInitializedRef = useRef(false)
  const animationFrameRef = useRef<number | null>(null)
  const lastScanRef = useRef<string | null>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Estado do scanner
  const [state, setState] = useState<QRScannerState>({
    isScanning: false,
    strategy: null,
    error: null,
    cameraPermission: 'prompt',
    initializationStatus: 'pending'
  })

  // Cleanup robusto
  const cleanup = useCallback(async () => {
    console.log('🧹 Iniciando cleanup robusto...')
    
    setState(prev => ({ 
      ...prev, 
      isScanning: false,
      initializationStatus: 'pending'
    }))

    try {
      // Limpar timeout de scan
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }

      // Limpar Html5Qrcode
    if (scannerRef.current) {
        if (scannerRef.current?.isScanning) {
          await scannerRef.current?.stop()
        }
        await scannerRef.current?.clear()
        scannerRef.current = null
    }

      // Limpar WebRTC
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
      try {
          track.stop()
      } catch (error) {
            console.warn('⚠️ Erro ao parar track:', error)
      }
        })
      streamRef.current = null
    }

      // Limpar animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }

      isInitializedRef.current = false
      lastScanRef.current = null
    console.log('✅ Cleanup concluído')
    } catch (error) {
      console.error('⚠️ Erro no cleanup:', error)
    }
  }, [])

  // Função para processar QR code
  const processQRCode = useCallback((qrCode: string) => {
    // Evitar scans duplicados em sequência
    if (lastScanRef.current === qrCode) {
      return
    }

    lastScanRef.current = qrCode
    onScan(qrCode)

    // Resetar último scan após 2 segundos
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
    }
    scanTimeoutRef.current = setTimeout(() => {
      lastScanRef.current = null
    }, 2000)
  }, [onScan])

  // Iniciar scanner com Html5Qrcode
  const startHtml5QrCode = useCallback(async () => {
    try {
      console.log('📱 Iniciando Html5Qrcode...')
      setState(prev => ({ 
        ...prev, 
        strategy: 'html5qrcode',
        initializationStatus: 'initializing'
      }))

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-scanner')
      }

      const devices = await Html5Qrcode.getCameras()
      if (!devices.length) {
        throw new Error('Nenhuma câmera encontrada')
      }

      // Tentar usar câmera traseira em dispositivos móveis
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        typeof navigator !== 'undefined' ? navigator.userAgent : ''
      )
      
      const deviceId = isMobile 
        ? devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id
        : devices[0].id
      
      await scannerRef.current.start(
        deviceId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        processQRCode,
        () => {} // Ignorar erros de scan
      )

      setState(prev => ({ 
        ...prev, 
        isScanning: true, 
        error: null,
        cameraPermission: 'granted',
        initializationStatus: 'ready'
      }))
      
      return true
    } catch (error) {
      console.error('❌ Erro ao iniciar Html5Qrcode:', error)
      setState(prev => ({ 
        ...prev,
        error: 'Erro ao iniciar câmera',
        strategy: null,
        initializationStatus: 'error'
      }))
      return false
    }
  }, [processQRCode])

  // Iniciar scanner com WebRTC nativo
  const startWebRTCNative = useCallback(async (
    videoRef: React.RefObject<HTMLVideoElement>,
    canvasRef: React.RefObject<HTMLCanvasElement>
  ) => {
    try {
      console.log('🎥 Iniciando WebRTC nativo...')
      setState(prev => ({ 
        ...prev, 
        strategy: 'webrtc-native',
        initializationStatus: 'initializing'
      }))
      
      if (!videoRef.current || !canvasRef.current) {
        throw new Error('Refs não disponíveis')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          aspectRatio: 1
        }
      })
      
      videoRef.current.srcObject = stream
      await videoRef.current.play()

      streamRef.current = stream
          const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Contexto 2D não disponível')
      }

      // Configurar dimensões
      const size = Math.min(videoRef.current.videoWidth, videoRef.current.videoHeight)
      canvas.width = size
      canvas.height = size

      // Função de scan
      const scan = () => {
        if (!videoRef.current || !context || !canvas) return

        context.drawImage(
          videoRef.current,
          (videoRef.current.videoWidth - size) / 2,
          (videoRef.current.videoHeight - size) / 2,
          size,
          size,
          0,
          0,
          canvas.width,
          canvas.height
        )

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (code) {
          processQRCode(code.data)
        }

        animationFrameRef.current = requestAnimationFrame(scan)
      }

      scan()

      setState(prev => ({ 
        ...prev, 
        isScanning: true, 
        error: null,
        cameraPermission: 'granted',
        initializationStatus: 'ready'
      }))
      
      return true
    } catch (error) {
      console.error('❌ Erro ao iniciar WebRTC:', error)
      
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setState(prev => ({ 
          ...prev,
          error: 'Permissão da câmera negada',
          cameraPermission: 'denied',
          strategy: null,
          initializationStatus: 'error'
        }))
      } else {
        setState(prev => ({ 
          ...prev,
          error: 'Erro ao iniciar câmera',
          strategy: null,
          initializationStatus: 'error'
        }))
      }
      
      return false
    }
  }, [processQRCode])

  // Iniciar scanner com fallback
  const startScanning = useCallback(async (videoRef: React.RefObject<HTMLVideoElement>, canvasRef: React.RefObject<HTMLCanvasElement>) => {
    console.log('🎥 Iniciando scanner...')
    
    setState(prev => ({ 
      ...prev, 
      isScanning: true, 
      error: null,
      initializationStatus: 'initializing'
    }))

    try {
      // Tentar Html5Qrcode primeiro
      console.log('📱 Tentando estratégia Html5Qrcode...')
      const html5QrcodeSuccess = await startHtml5QrCode()
      
      // Se Html5Qrcode falhar e fallback estiver habilitado, tentar WebRTC
      if (!html5QrcodeSuccess && fallbackEnabled) {
        console.log('🔄 Html5Qrcode falhou, tentando WebRTC...')
        const webrtcSuccess = await startWebRTCNative(videoRef, canvasRef)
        
        if (!webrtcSuccess) {
          console.error('❌ Todas as estratégias falharam')
          setState(prev => ({ 
            ...prev, 
            isScanning: false,
            error: 'Não foi possível iniciar a câmera',
            initializationStatus: 'error'
          }))
          return
        }
      }

      setState(prev => ({ 
        ...prev,
        initializationStatus: 'ready'
      }))

    } catch (error) {
      console.error('❌ Erro ao iniciar scanner:', error)
      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        error: 'Erro ao iniciar scanner',
        initializationStatus: 'error'
      }))
    }
  }, [startHtml5QrCode, startWebRTCNative, fallbackEnabled])

  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    state,
    startScanning,
    stopScanning: cleanup
  }
} 