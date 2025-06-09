'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useVibrate } from '@/hooks/useVibrate'
import { useScannerSounds } from '@/hooks/useScannerSounds'
import { Scanner } from '@yudiel/react-qr-scanner'
import ScannerFeedback from '../components/ScannerFeedback'
import ViewFinder from '../components/ViewFinder'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2, Clock, QrCode, Users, Wifi, WifiOff, LogOut, Settings, Search } from 'lucide-react'
import { formatPortugalTime, isValidTimestamp } from '@/lib/utils/time'

interface ScannerData {
  scanner: {
    id: string
    event_id: string
    scanner_name: string
    username: string
    is_active: boolean
    events: {
      id: string
      title: string
      date: string
      organization_id: string
    }
  }
  event: {
    id: string
    title: string
    date: string
    organization_id: string
  }
}

interface ScanResult {
  id: string
  name: string
  phone: string
  timestamp: string
  method: 'qr_code' | 'name_search'
  success: boolean
  status: 'success' | 'error' | 'already-checked' | 'processing'
  message: string
}

interface ApiResponse {
  success: boolean
  error?: string
  message?: string
  guest_id?: string
  guest_name?: string
  guest_phone?: string
  check_in_time?: string
  check_in_display_time?: string // 🕐 Novo campo formatado da API
  scan_method?: string
  already_checked_in?: boolean
}

export default function ScannerDashboard() {
  const router = useRouter()
  const vibrate = useVibrate()
  const playSound = useScannerSounds()

  const [isOnline, setIsOnline] = useState(true)
  const [scannerData, setScannerData] = useState<ScannerData | null>(null)
  const [currentScan, setCurrentScan] = useState<ScanResult | null>(null)
  const [recentScans, setRecentScans] = useState<ScanResult[]>([])
  const [stats, setStats] = useState({ total: 0, checkedIn: 0, pendingSync: 0 })

  const DEBOUNCE_DELAY = 200 // 200ms - só para evitar múltiplas detecções acidentais
  const lastScannedCodeRef = useRef('')
  const lastScanTimeRef = useRef(0)

  useEffect(() => {
    // Verifica se tem token
    const token = localStorage.getItem('scanner_token')
    if (!token) {
      router.push('/scanner/login')
      return
    }

    // Carrega dados do scanner
    const loadScannerData = async () => {
      try {
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`

        const response = await fetch('/api/scanners/auth/check', {
          headers: {
            'Authorization': formattedToken
          }
        })

        if (!response.ok) {
          throw new Error('Não autorizado')
        }

        const data = await response.json()
        setScannerData(data)

        // Carrega stats iniciais
        loadStats(data.scanner.event_id)
      } catch (error) {
        console.error('❌ Erro ao carregar dados do scanner:', error)
        router.push('/scanner/login')
      }
    }

    // Carrega stats do evento
    const loadStats = async (eventId: string) => {
      try {
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`

        console.log('📊 Carregando stats para evento:', eventId)
        const response = await fetch(`/api/scanners/stats?event_id=${eventId}`, {
          headers: {
            'Authorization': formattedToken
          }
        })
      
        console.log('📡 Response stats:', response.status, response.statusText)
        const data = await response.json()
        console.log('📊 Stats recebidas:', data)
        
        if (response.ok && data.success) {
          setStats(prev => ({
            ...prev,
            total: data.count,
            checkedIn: data.checkedIn
          }))
          console.log('📊 Stats atualizadas:', { total: data.count, checkedIn: data.checkedIn })
        } else if (response.status === 401) {
          // Sessão expirada - fazer logout automático
          console.log('🚨 Sessão expirada detectada - fazendo logout automático')
          handleLogout()
        }
      } catch (error) {
        console.error('❌ Erro ao carregar stats:', error)
      }
    }

    // Monitora status online/offline
    const checkOnlineStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)

    // Carrega scans recentes do localStorage
    const savedScans = localStorage.getItem('recent_scans')
    if (savedScans) {
      try {
        const parsedScans = JSON.parse(savedScans)
        // 🧹 LIMPEZA: Filtrar scans com timestamps inválidos para evitar loops de erro
        const validScans = parsedScans.filter((scan: ScanResult) => isValidTimestamp(scan.timestamp))
        setRecentScans(validScans)
        
        // 💾 Salvar scans limpos de volta no localStorage
        if (validScans.length !== parsedScans.length) {
          localStorage.setItem('recent_scans', JSON.stringify(validScans))
          console.log('🧹 Limpeza: Removidos', parsedScans.length - validScans.length, 'scans com timestamps inválidos')
        }
      } catch (error) {
        console.error('❌ Erro ao carregar scans do localStorage:', error)
        // 🗑️ Se há erro no parse, limpar o localStorage
        localStorage.removeItem('recent_scans')
        setRecentScans([])
      }
    }

    loadScannerData()

    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
    }
  }, [router])

  const processScan = async (qrCode: string, method: 'qr_code' | 'name_search') => {
    console.log('🔍 Processando scan:', { qrCode, method })
    
    const token = localStorage.getItem('scanner_token')
    if (!token) {
      throw new Error('Não autorizado')
    }

    // Garantir que o token está formatado corretamente
    const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`

    const response = await fetch('/api/scanners/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': formattedToken
      },
      body: JSON.stringify({
        qr_code: qrCode,
        scan_method: method
      })
    })

    console.log('📡 Response scan:', response.status, response.statusText)
    
    let data: ApiResponse
    try {
      data = await response.json()
      console.log('📡 Response data:', data)
    } catch (jsonError) {
      console.error('❌ Erro ao parsear JSON da resposta:', jsonError)
      throw new Error('Resposta inválida do servidor')
    }

    // ✅ Tratar 409 como "sucesso especial" ANTES de verificar erros
    if (response.status === 409) {
      console.log('✅ Check-in já realizado (409):', {
        guest: data.guest_name,
        check_in_time: data.check_in_time,
        check_in_display_time: data.check_in_display_time
      })
      return {
        success: false,
        already_checked_in: true,
        guest_name: data.guest_name,
        guest_phone: data.guest_phone,
        check_in_time: data.check_in_time,
        check_in_display_time: data.check_in_display_time, // 🕐 Passar horário formatado
        status: 'already-checked' as const,
        error: data.error || 'Check-in já realizado anteriormente'
      }
    }

    // Agora só entram erros REAIS
    if (!response.ok) {
      console.error('❌ Erro real na resposta:', {
        status: response.status,
        statusText: response.statusText,
        data: data || 'Response vazio',
        url: response.url
      })
      throw new Error(data.error || 'Erro ao processar QR code')
    }

    return {
      success: true,
      already_checked_in: false,
      guest_name: data.guest_name,
      guest_phone: data.guest_phone,
      check_in_time: data.check_in_time,
      check_in_display_time: data.check_in_display_time, // 🕐 Incluir horário formatado
      status: 'success' as const
    }
  }

  const handleScan = async (detectedCodes: Array<{ format: string; rawValue: string }>) => {
    if (!detectedCodes.length) return
    
    const qrCode = detectedCodes[0].rawValue
    const now = Date.now()
    
    // Debounce para evitar scans duplicados
    if (qrCode === lastScannedCodeRef.current && (now - lastScanTimeRef.current) < DEBOUNCE_DELAY) {
      return
    }
    
    lastScannedCodeRef.current = qrCode
    lastScanTimeRef.current = now
    
    try {
      setCurrentScan({
        id: qrCode,
        name: 'Processando...',
        phone: '',
        timestamp: new Date().toISOString(),
        method: 'qr_code',
        success: false,
        status: 'processing',
        message: 'Verificando QR code...'
      })

      const result = await processScan(qrCode, 'qr_code')
      
      // Usar timestamp do check-in real quando disponível
      const actualTimestamp = result.check_in_time || new Date().toISOString()
      
      // 🕐 Usar horário formatado da API quando disponível, senão formatar localmente
      const displayTime = result.check_in_display_time || formatPortugalTime(actualTimestamp)
      
      const finalScan: ScanResult = {
        id: qrCode,
        name: result.guest_name || 'QR Code Inválido',
        phone: result.guest_phone || '-',
        timestamp: actualTimestamp,
        method: 'qr_code',
        success: result.success,
        status: result.status,
        message: result.error || (result.already_checked_in ? 
          `Check-in já realizado às ${displayTime}` : 
          'Check-in realizado com sucesso')
      }

      setCurrentScan(finalScan)
      setRecentScans(prev => {
        // 🛡️ VALIDAÇÃO: Garantir que o novo scan tem timestamp válido
        if (isValidTimestamp(finalScan.timestamp)) {
          const updated = [finalScan, ...prev].slice(0, 50) // 🔧 Limite de 50 scans para evitar memory leak
          localStorage.setItem('recent_scans', JSON.stringify(updated))
          return updated
        } else {
          console.warn('⚠️ Scan com timestamp inválido não foi salvo:', finalScan.timestamp)
          return prev
        }
      })

      // Auto-clear feedback após 3 segundos para permitir novo scan
      setTimeout(() => {
        setCurrentScan(null)
        // Reset debounce imediatamente para permitir re-scan do mesmo QR
        lastScannedCodeRef.current = ''
        lastScanTimeRef.current = 0
      }, 3000)

      if (result.success) {
        setStats(prev => ({
          ...prev,
          checkedIn: prev.checkedIn + 1
        }))
        vibrate([200])
        playSound('success')
      } else if (result.already_checked_in) {
        vibrate([100, 100, 100])
        playSound('already-checked')
      } else {
        vibrate([100, 100, 100])
        playSound('error')
      }

    } catch (error: any) {
      console.error('❌ Erro ao processar scan:', error)
      const errorScan: ScanResult = {
        id: qrCode,
        name: 'Erro no Scan',
        phone: '-',
        timestamp: new Date().toISOString(),
        method: 'qr_code',
        success: false,
        status: 'error',
        message: error.message || 'Erro ao processar QR code'
      }
      
      setCurrentScan(errorScan)
      setRecentScans(prev => {
        // 🛡️ VALIDAÇÃO: Garantir que o erro scan tem timestamp válido
        if (isValidTimestamp(errorScan.timestamp)) {
          const updated = [errorScan, ...prev].slice(0, 50) // 🔧 Limite de 50 scans para evitar memory leak
          localStorage.setItem('recent_scans', JSON.stringify(updated))
          return updated
        } else {
          console.warn('⚠️ Error scan com timestamp inválido não foi salvo:', errorScan.timestamp)
          return prev
        }
      })

      // Auto-clear feedback de erro após 3 segundos
      setTimeout(() => {
        setCurrentScan(null)
        // Reset debounce imediatamente para permitir re-scan do mesmo QR
        lastScannedCodeRef.current = ''
        lastScanTimeRef.current = 0
      }, 3000)

      vibrate([100, 100, 100])
      playSound('error')
    }
  }

  const handleError = (error: unknown) => {
    console.error('❌ Erro no scanner:', error)
    
    let errorMessage = 'Erro ao acessar a câmera'
    
    // Tratamento específico para erros de permissão
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError' || error.message.includes('Permission denied')) {
        errorMessage = 'Permissão da câmera negada. Por favor, permita o acesso à câmera.'
      } else if (error.name === 'NotFoundError' || error.message.includes('Requested device not found')) {
        errorMessage = 'Câmera não encontrada. Verifique se seu dispositivo tem uma câmera disponível.'
      } else if (error.name === 'NotReadableError' || error.message.includes('Could not start video source')) {
        errorMessage = 'Não foi possível acessar a câmera. Ela pode estar sendo usada por outro aplicativo.'
      }
    }

    setCurrentScan({
      id: '',
      name: 'Erro na Câmera',
      phone: '-',
      timestamp: new Date().toISOString(),
      method: 'qr_code',
      success: false,
      status: 'error',
      message: errorMessage
    })

    // Tenta reiniciar a câmera após 3 segundos
    setTimeout(() => {
      setCurrentScan(null)
    }, 3000)
  }

  const clearCurrentScan = () => {
    setCurrentScan(null)
    // Reset debounce para permitir novo scan do mesmo QR code
    lastScannedCodeRef.current = ''
    lastScanTimeRef.current = 0
  }

  // Nova função para forçar reset do scanner
  const forceResetScanner = () => {
    console.log('🔄 Reset forçado do scanner')
    setCurrentScan(null)
    lastScannedCodeRef.current = ''
    lastScanTimeRef.current = 0
  }

  const handleLogout = async () => {
    const token = localStorage.getItem('scanner_token')
    
    if (token) {
      try {
        // Chamar API de logout para invalidar sessão no servidor
        const formattedToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
        await fetch('/api/scanners/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': formattedToken
          }
        })
      } catch (error) {
        console.error('❌ Erro ao fazer logout no servidor:', error)
        // Continua com logout local mesmo se servidor falhar
      }
    }
    
    // Limpar dados locais
    localStorage.removeItem('scanner_token')
    localStorage.removeItem('recent_scans')
    
    // Redirecionar para login
    router.push('/scanner/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Status e Stats */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <Badge variant={isOnline ? "success" : "destructive"} className="h-8 px-2 sm:px-3 text-xs">
              {isOnline ? (
                <><Wifi className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Online</>
              ) : (
                <><WifiOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Offline</>
              )}
            </Badge>
            {scannerData?.event?.title && (
              <Badge variant="outline" className="h-8 px-1 sm:px-2 text-xs max-w-32 sm:max-w-none">
                <span className="truncate">📅 {scannerData.event.title}</span>
              </Badge>
            )}
            <button
              onClick={() => router.push('/scanner/search')}
              className="h-8 w-8 sm:w-auto sm:px-2 flex items-center justify-center sm:gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors border border-indigo-200 hover:border-indigo-300"
              title="Pesquisar convidado"
            >
              <Search className="h-4 w-4" />
            </button>
            {stats.pendingSync > 0 && (
              <Badge variant="secondary" className="h-8 px-2 text-xs">
                {stats.pendingSync}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Badge variant="outline" className="h-8 px-2 text-xs">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              {stats.checkedIn}/{stats.total}
            </Badge>
            <button 
              onClick={handleLogout}
              className="h-8 w-8 sm:w-auto sm:px-3 flex items-center justify-center sm:gap-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Section */}
      <div className="w-full max-w-md mx-auto p-3 sm:p-4">
        <div className="mb-4 overflow-hidden rounded-lg bg-white shadow-lg">
          <div 
            className="relative aspect-square cursor-pointer" 
            onClick={forceResetScanner}
            title="Toque para resetar scanner"
          >
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{
                facingMode: 'environment',
                aspectRatio: 1,
                width: { ideal: 1080 },
                height: { ideal: 1080 }
              }}
              scanDelay={500}
              formats={['qr_code']}
              styles={{
                container: {
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }
              }}
            />
            <ViewFinder />
            
            {/* Indicador visual para reset */}
            {currentScan && (
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-3 py-2 rounded-md shadow-lg">
                <span className="hidden sm:inline">Toque para ler novamente</span>
                <span className="sm:hidden">Toque para resetar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feedback de Scan */}
      {currentScan && (
        <ScannerFeedback
          success={currentScan.success}
          error={currentScan.success ? null : currentScan.message}
          status={currentScan.status}
          guest_name={currentScan.name}
          guest_phone={currentScan.phone}
          check_in_time={currentScan.timestamp}
          already_checked_in={currentScan.status === 'already-checked'}
          onClear={forceResetScanner}
        />
      )}

      {/* Recent Scans - Lista Deslizante */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg md:relative md:mt-6 md:shadow-none md:border-t-0">
        <div className="px-3 sm:px-4 py-3 flex items-center justify-between border-b">
          <h3 className="font-medium text-sm sm:text-base">Scans Recentes</h3>
          <Badge variant="outline" className="text-xs">{recentScans.length}</Badge>
        </div>
        
        <div className="max-h-[40vh] overflow-y-auto overscroll-contain">
          {recentScans.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-500">
              <QrCode className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum scan realizado</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentScans.map((scan, index) => (
                <div key={scan.id + index} className="px-3 sm:px-4 py-3 flex items-center gap-3 min-h-[48px]">
                  <div className="flex-shrink-0">
                    {scan.success ? (
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm sm:text-base">{scan.name}</p>
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                      <Clock className="h-3 w-3" />
                      {formatPortugalTime(scan.timestamp)}
                    </div>
                    <Badge 
                      variant={scan.success ? "success" : "destructive"} 
                      className="text-xs"
                    >
                      {scan.method === 'qr_code' ? 'QR' : 'Busca'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 