'use client'

import { useRef, useEffect, useCallback, useState, memo } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QRScannerRobustProps {
  eventId: string
  onScan: (qrCode: string) => void
  className?: string
}

interface ScannerState {
  isScanning: boolean
  error: string | null
  cameraPermission: 'granted' | 'denied' | 'prompt'
  initializationStatus: 'pending' | 'initializing' | 'ready' | 'error'
}

function QRScannerRobustComponent({ eventId, onScan, className }: QRScannerRobustProps) {
  // Refs
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const lastScanRef = useRef<string | null>(null)
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initializingRef = useRef(false)
  const mountedRef = useRef(false)

  // Estado do scanner
  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    error: null,
    cameraPermission: 'prompt',
    initializationStatus: 'pending'
  })

  // Função para processar QR code
  const processQRCode = useCallback((qrCode: string) => {
    console.log('📱 QR Code detectado:', qrCode)
    
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

  // Cleanup robusto
  const cleanup = useCallback(async () => {
    console.log('🧹 Iniciando cleanup...')
    
    try {
      // Limpar timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }

      // Limpar Html5Qrcode
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
        scannerRef.current = null
      }

      setState(prev => ({ 
        ...prev, 
        isScanning: false,
        initializationStatus: 'pending'
      }))

      console.log('✅ Cleanup concluído')
    } catch (error) {
      console.error('⚠️ Erro no cleanup:', error)
    }
  }, [])

  // Iniciar scanner
  const startScanner = useCallback(async () => {
    if (initializingRef.current || !mountedRef.current || !eventId) {
      return
    }

    try {
      initializingRef.current = true
      
      setState(prev => ({ 
        ...prev, 
        initializationStatus: 'initializing',
        error: null
      }))

      console.log('🎥 Iniciando Html5Qrcode...')

      // Criar nova instância do scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-scanner-container')
      }

      // Obter câmeras disponíveis
      const devices = await Html5Qrcode.getCameras()
      if (!devices.length) {
        throw new Error('Nenhuma câmera encontrada')
      }

      // Detectar dispositivo móvel
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
      
      // Selecionar câmera (preferencialmente traseira em dispositivos móveis)
      const deviceId = isMobile 
        ? devices.find(d => d.label.toLowerCase().includes('back'))?.id || devices[0].id
        : devices[0].id

      // Configurações do scanner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      // Iniciar scanner
      await scannerRef.current.start(
        deviceId,
        config,
        processQRCode,
        (errorMessage: string) => {
          // Ignorar erros de scan (quando não há QR code visível)
          // console.log('🔍 Buscando QR code...')
        }
      )

      setState(prev => ({ 
        ...prev,
        isScanning: true,
        error: null,
        cameraPermission: 'granted',
        initializationStatus: 'ready'
      }))

      console.log('✅ Scanner iniciado com sucesso')

    } catch (error: any) {
      console.error('❌ Erro ao iniciar scanner:', error)
      
      let errorMessage = 'Erro ao iniciar câmera'
      let cameraPermission: 'granted' | 'denied' | 'prompt' = 'prompt'

      if (error.name === 'NotAllowedError' || error.message.includes('Permission')) {
        errorMessage = 'Permissão da câmera negada'
        cameraPermission = 'denied'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Câmera não encontrada'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Câmera em uso por outro aplicativo'
      }

      setState(prev => ({ 
        ...prev,
        isScanning: false,
        error: errorMessage,
        cameraPermission,
        initializationStatus: 'error'
      }))
    } finally {
      initializingRef.current = false
    }
  }, [eventId, processQRCode])

  // Reiniciar scanner
  const handleRestart = useCallback(async () => {
    try {
      console.log('🔄 Reiniciando scanner...')
      await cleanup()
      
      // Pequeno delay para garantir cleanup
      await new Promise(resolve => setTimeout(resolve, 500))
      
      if (mountedRef.current) {
        await startScanner()
      }
    } catch (error) {
      console.error('❌ Erro ao reiniciar scanner:', error)
    }
  }, [cleanup, startScanner])

  // Controle de ciclo de vida
  useEffect(() => {
    mountedRef.current = true
    console.log('🔄 Componente montado')

    return () => {
      console.log('🔄 Componente desmontando...')
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  // Iniciar scanner quando eventId estiver disponível
  useEffect(() => {
    if (eventId && mountedRef.current && !state.isScanning && !initializingRef.current) {
      console.log('🎥 Iniciando scanner para evento:', eventId)
      startScanner()
    }
  }, [eventId, startScanner, state.isScanning])

  return (
    <div className={cn("qr-scanner-robust w-full flex flex-col", className)}>
      {/* Container Principal */}
      <div className="relative w-full h-[400px] md:h-[500px] bg-black rounded-lg overflow-hidden">
        
        {/* Container Html5Qrcode */}
          <div 
          id="qr-scanner-container"
            className="absolute inset-0 w-full h-full flex items-center justify-center"
          />

        {/* Overlay de Scan */}
        {state.isScanning && !state.error && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-56 h-56 md:w-64 md:h-64">
                  {/* Cantos do Scanner */}
                  <div className="absolute -inset-1">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                  </div>
                </div>
              </div>
            
            {/* Texto de instrução */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-white/70">
              <p>Posicione o QR code no centro da tela</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {state.initializationStatus === 'initializing' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-white text-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-3"></div>
              <p className="text-base font-medium">Iniciando câmera...</p>
              <p className="text-sm text-gray-400 mt-1">Aguarde um momento</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {state.error && (
          <div className="absolute inset-0 bg-red-500/95 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="text-white text-center max-w-sm">
              <AlertCircle className="h-10 w-10 mx-auto mb-3" />
              <h3 className="text-lg font-bold mb-2">Scanner Indisponível</h3>
              <p className="text-sm mb-3">{state.error}</p>
              
              {state.cameraPermission === 'denied' && (
                <div className="bg-white/20 rounded-lg p-3 mb-4">
                  <p className="text-sm">
                    Por favor, permita acesso à câmera nas configurações do seu navegador
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-2 text-xs">
                    <Smartphone className="h-4 w-4" />
                    <span>Configurações → Câmera → Permitir</span>
                  </div>
                </div>
              )}
              
              <Button 
                onClick={handleRestart}
                className="bg-white text-red-500 hover:bg-gray-100"
                size="sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* No Event State */}
        {!eventId && (
          <div className="absolute inset-0 bg-gray-800/95 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="text-white text-center p-4">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-60" />
              <p className="text-lg font-medium">Scanner Inativo</p>
              <p className="text-sm text-gray-300 mt-1">Aguardando evento...</p>
            </div>
          </div>
        )}

        {/* Success Indicator */}
        {state.isScanning && !state.error && (
          <div className="absolute top-4 right-4 z-30">
            <div className="bg-green-500 rounded-full p-1.5 shadow-lg animate-pulse">
              <div className="bg-white rounded-full p-0.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {state.isScanning && (
          <div className="absolute top-4 left-4 z-30">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
              <p className="text-white text-xs font-medium flex items-center">
                <Camera className="h-3 w-3 mr-1.5" />
                Scanner Ativo
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      {state.isScanning && (
        <div className="mt-4 flex gap-2 justify-center">
          <Button 
            onClick={cleanup}
            variant="outline"
            size="sm"
            className="text-sm px-4"
          >
            Parar Scanner
          </Button>
          <Button 
            onClick={handleRestart}
            variant="outline"
            size="sm"
            className="text-sm px-4"
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reiniciar
          </Button>
        </div>
      )}

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
          <div className="flex items-center gap-3 flex-wrap">
            <span>{state.isScanning ? '✅ Ativo' : '⏸️ Inativo'}</span>
            <span>Status: {state.initializationStatus}</span>
            <span>Permissão: {state.cameraPermission}</span>
            {state.error && <span className="text-red-500">{state.error}</span>}
          </div>
        </div>
      )}
    </div>
  )
} 

export default memo(QRScannerRobustComponent)