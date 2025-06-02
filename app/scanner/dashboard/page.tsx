'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, Search, Settings, Wifi, WifiOff, Users, CheckCircle2, Clock, Phone, QrCode } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface ScannerData {
  scanner_name: string
  username: string
  event_id: string
}

interface EventData {
  id: string
  title: string
  date: string
  location: string
}

interface ScanResult {
  id: string
  name: string
  phone: string
  timestamp: string
  method: 'qr_code' | 'name_search'
  success: boolean
}

export default function ScannerDashboard() {
  const [scannerData, setScannerData] = useState<ScannerData | null>(null)
  const [eventData, setEventData] = useState<EventData | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [lastScan, setLastScan] = useState<ScanResult | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    checkedIn: 0,
    pendingSync: 0
  })
  const [isScanning, setIsScanning] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const router = useRouter()

  // Garantir hidratação correta
  useEffect(() => {
    setMounted(true)
    
    // Carregar dados do localStorage após mount
    const token = localStorage.getItem('scanner_token')
    const scannerDataStr = localStorage.getItem('scanner_data')
    const eventDataStr = localStorage.getItem('event_data')

    if (!token || !scannerDataStr || !eventDataStr) {
      router.push('/scanner/login')
      return
    }

    const scannerInfo = JSON.parse(scannerDataStr)
    const eventInfo = JSON.parse(eventDataStr)
    
    setScannerData(scannerInfo)
    setEventData(eventInfo)
    
    // Verificar conectividade
    setIsOnline(navigator.onLine)
    
    // Carregar dados essenciais
    loadGuestsCache(eventInfo.id)
    loadStats(eventInfo.id)
  }, [router])

  // Monitor conexão apenas após mount
  useEffect(() => {
    if (!mounted) return

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [mounted])

  const loadGuestsCache = async (eventId: string) => {
    try {
      const token = localStorage.getItem('scanner_token')
      console.log('🔍 Carregando guests para evento:', eventId)
      
      // Tentar carregar guests do servidor
      const response = await fetch(`/api/guests?event_id=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log('📡 Response guests:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('📋 Dados recebidos:', data)
        console.log('📋 Guests carregados:', data.guests?.length || data.length || 0)
        
        // Salvar no cache local - verificar se data.guests ou data diretamente
        const guestsList = data.guests || data || []
        localStorage.setItem('cached_guests', JSON.stringify(guestsList))
        
        // Atualizar stats com total correto
        setStats(prev => ({
          ...prev,
          total: guestsList.length
        }))
      } else {
        console.log('⚠️ Erro ao carregar guests:', response.status, 'usando cache local')
        
        // Tentar carregar do cache local
        const cached = localStorage.getItem('cached_guests')
        if (cached) {
          const guestsList = JSON.parse(cached)
          setStats(prev => ({
            ...prev,
            total: guestsList.length
          }))
        }
      }
    } catch (error) {
      console.log('⚠️ Offline - usando cache local para guests')
      
      // Carregar do cache se disponível
      const cached = localStorage.getItem('cached_guests')
      if (cached) {
        const guestsList = JSON.parse(cached)
        setStats(prev => ({
          ...prev,
          total: guestsList.length
        }))
      }
    }
  }

  const loadStats = async (eventId: string) => {
    try {
      console.log('📊 Carregando stats para evento:', eventId)
      const response = await fetch(`/api/guest-count?eventId=${eventId}`)
      
      console.log('📡 Response stats:', response.status, response.statusText)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Stats recebidas:', data)
        
        setStats(prev => ({
          total: data.total || data.count || prev.total, // Tentar diferentes campos
          checkedIn: data.checkedIn || data.checked_in || 0,
          pendingSync: JSON.parse(localStorage.getItem('pending_scans') || '[]').length
        }))
        
        console.log('📊 Stats atualizadas:', { 
          total: data.total || data.count, 
          checkedIn: data.checkedIn || data.checked_in 
        })
      } else {
        console.log('⚠️ Erro ao carregar stats:', response.status)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar stats:', error)
    }
  }

  const startScanner = async () => {
    if (scannerRef.current) {
      await stopScanner()
    }

    try {
      setError('')
      
      // ✅ CORREÇÃO: Renderizar elemento PRIMEIRO
      setScannerReady(true)
      setIsScanning(true)
      
      // ✅ Aguardar renderização do DOM
      await new Promise(resolve => setTimeout(resolve, 150))
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: "environment" // Câmera traseira
        }
      }

      scannerRef.current = new Html5QrcodeScanner('qr-scanner', config, false)
      
      scannerRef.current.render(
        (decodedText) => {
          console.log('📷 QR Scaneado:', decodedText)
          handleQRScan(decodedText)
        },
        (error) => {
          // Ignorar erros de scan contínuos
        }
      )
      
      console.log('📷 Scanner iniciado com sucesso')
      
    } catch (error) {
      console.error('❌ Erro ao iniciar scanner:', error)
      setError('Erro ao aceder à câmera. Verifique as permissões.')
      setScannerReady(false)
      setIsScanning(false)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.clear()
        scannerRef.current = null
        setIsScanning(false)
        setScannerReady(false)
        console.log('📷 Scanner parado')
      } catch (error) {
        console.error('Erro ao parar scanner:', error)
      }
    }
  }

  const handleQRScan = async (qrCode: string) => {
    try {
      setError('')
      
      const result = await processScan(qrCode, 'qr_code')
      
      if (result.success) {
        setLastScan({
          id: result.guest_id,
          name: result.guest_name,
          phone: result.guest_phone,
          timestamp: new Date().toLocaleTimeString('pt-PT'),
          method: 'qr_code',
          success: true
        })
        
        setStats(prev => ({
          ...prev,
          checkedIn: prev.checkedIn + 1
        }))
        
        // Feedback visual/sonoro
        console.log('✅ Check-in realizado:', result.guest_name)
        
      } else {
        setError(result.error || 'QR Code inválido')
        console.log('❌ Scan falhou:', result.error)
      }
    } catch (error) {
      console.error('❌ Erro no scan:', error)
      setError('Erro ao processar QR code')
    }
  }

  const processScan = async (qrCode: string, method: 'qr_code' | 'name_search') => {
    const token = localStorage.getItem('scanner_token')
    
    try {
      const response = await fetch('/api/scanners/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          qr_code: qrCode,
          scan_method: method
        })
      })

      return await response.json()
    } catch (error) {
      if (!isOnline) {
        return processOfflineScan(qrCode, method)
      }
      throw error
    }
  }

  const processOfflineScan = (qrCode: string, method: 'qr_code' | 'name_search') => {
    const cachedGuests = JSON.parse(localStorage.getItem('cached_guests') || '[]')
    const guest = cachedGuests.find((g: any) => 
      g.qr_code_url?.includes(qrCode) || g.id === qrCode
    )

    if (guest && !guest.checked_in) {
      guest.checked_in = true
      guest.check_in_time = new Date().toISOString()
      
      const pendingScans = JSON.parse(localStorage.getItem('pending_scans') || '[]')
      pendingScans.push({
        guest_id: guest.id,
        scan_time: new Date().toISOString(),
        method,
        qr_code: qrCode
      })
      localStorage.setItem('pending_scans', JSON.stringify(pendingScans))
      
      setStats(prev => ({
        ...prev,
        pendingSync: prev.pendingSync + 1
      }))

      return {
        success: true,
        guest_id: guest.id,
        guest_name: guest.name,
        guest_phone: guest.phone
      }
    }

    return {
      success: false,
      error: guest ? 'Já fez check-in' : 'Convidado não encontrado'
    }
  }

  const goToNameSearch = () => {
    router.push('/scanner/search')
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-PT')
  }

  // Loading state enquanto não carregou
  if (!mounted || !scannerData || !eventData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Carregando scanner...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Mobile Optimized */}
      <div className="bg-indigo-600 text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">🎫 {scannerData.scanner_name}</h1>
            <p className="text-indigo-200 text-sm truncate max-w-[200px]">{eventData.title}</p>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Scanner Card */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Scanner QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!scannerReady ? (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Toque para ativar o scanner</p>
                <Button 
                  onClick={startScanner}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Ativar Scanner
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div 
                  id="qr-scanner" 
                  className="w-full rounded-lg overflow-hidden bg-black min-h-[300px] relative"
                >
                  {/* Overlay será adicionado pelo html5-qrcode */}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={stopScanner}
                    variant="outline"
                    className="flex-1"
                  >
                    Parar Scanner
                  </Button>
                  <Button 
                    onClick={() => {
                      stopScanner()
                      setTimeout(startScanner, 500)
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Reiniciar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Scan */}
        {lastScan && (
          <Card className="border-green-200 bg-green-50 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-green-800 text-lg truncate">{lastScan.name}</p>
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Phone className="h-3 w-3" />
                    <span>{lastScan.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{lastScan.timestamp}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-3xl font-bold text-indigo-600">{stats.checkedIn}</p>
                <p className="text-sm text-gray-600 font-medium">Check-ins</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-700">{stats.total}</p>
                <p className="text-sm text-gray-600 font-medium">Total</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingSync}</p>
                <p className="text-sm text-gray-600 font-medium">Pendentes</p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-center gap-2">
              <Badge variant={isOnline ? "default" : "secondary"} className="text-sm px-3 py-1">
                {isOnline ? "🟢 Online" : "🔄 Offline"}
              </Badge>
              {stats.pendingSync > 0 && (
                <Badge variant="outline" className="text-orange-600 text-sm px-3 py-1">
                  {stats.pendingSync} pendentes
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 gap-3">
          <Button 
            onClick={goToNameSearch} 
            variant="outline" 
            className="h-14 flex items-center justify-center gap-3 text-lg font-medium"
          >
            <Search className="h-5 w-5" />
            Pesquisar por Nome
          </Button>
        </div>

        {/* Event Info */}
        <Card className="shadow-lg">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 text-lg">Informações do Evento</h3>
            <div className="space-y-2 text-sm">
              <p><strong>Data:</strong> {formatTime(eventData.date)}</p>
              <p><strong>Local:</strong> {eventData.location}</p>
              <p><strong>Scanner:</strong> {scannerData.username}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 