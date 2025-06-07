import { memo } from 'react'
import { AlertCircle, Camera, CheckCircle2, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScanFeedbackProps {
  state: {
    isScanning: boolean
    error: string | null
    strategy: 'html5qrcode' | 'webrtc-native' | null
    cameraPermission: 'granted' | 'denied' | 'prompt'
    initializationStatus: 'pending' | 'initializing' | 'ready' | 'error'
    isReady: boolean
  }
}

function ScanFeedbackComponent({ state }: ScanFeedbackProps) {
  return (
    <>
      {/* Loading State */}
      {!state.isScanning && !state.error && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-white text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto mb-3"></div>
            <p className="text-base font-medium">
              {state.initializationStatus === 'pending' ? 'Preparando câmera...' :
               state.initializationStatus === 'initializing' ? 'Iniciando câmera...' :
               'Aguarde um momento'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {!state.isReady ? 'Inicializando componentes...' : 'Configurando câmera...'}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {state.error && (
        <div className="absolute inset-0 bg-red-500/95 backdrop-blur-sm flex items-center justify-center p-4">
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
          </div>
        </div>
      )}

      {/* Active Scanner Overlay */}
      {state.isScanning && !state.error && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-56 h-56 md:w-64 md:h-64">
              {/* Área de scan com feedback da estratégia atual */}
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl">
                {/* Cantos do Scanner */}
                <div className="absolute -inset-1">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
                </div>
              </div>
              {/* Linha de scan animada */}
              <div className="absolute inset-x-0 h-0.5 bg-green-500/50 animate-scan-line"></div>
            </div>
          </div>

          {/* Strategy Indicator */}
          <div className="absolute top-4 left-4">
            <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg">
              <p className="text-white text-xs font-medium flex items-center">
                <Camera className="h-3 w-3 mr-1.5" />
                {state.strategy === 'html5qrcode' ? 'Scanner Principal' : 'Scanner Alternativo'}
              </p>
            </div>
          </div>

          {/* Success Indicator */}
          <div className="absolute top-4 right-4">
            <div className="bg-green-500 rounded-full p-1.5 shadow-lg animate-pulse">
              <div className="bg-white rounded-full p-0.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Memoize o componente para evitar re-renderizações desnecessárias
export const ScanFeedback = memo(ScanFeedbackComponent) 