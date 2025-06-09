'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Hook useDebounce
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Search, User, CheckCircle2, AlertCircle, Wifi, WifiOff } from 'lucide-react'

interface SearchResult {
  id: string
  name: string
  phone: string
  checked_in: boolean
  check_in_time?: string
  promoter_name: string
  relevance_score: number
}

export default function ScannerSearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(true)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Debounce da pesquisa por 500ms
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  // Garantir hidratação correta
  useEffect(() => {
    setMounted(true)
    
    // Verificar autenticação
    const token = localStorage.getItem('scanner_token')
    if (!token) {
      router.push('/scanner/login')
      return
    }

    // Verificar conectividade
    setIsOnline(navigator.onLine)
  }, [router])

  // Monitor conectividade apenas após mount
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

  // Pesquisa automática quando debouncedSearchTerm muda
  useEffect(() => {
    if (!mounted) return
    if (!debouncedSearchTerm.trim()) {
      setSearchResults([])
      return
    }
    if (debouncedSearchTerm.trim().length >= 1) {
      performSearch(debouncedSearchTerm.trim())
    }
  }, [debouncedSearchTerm, mounted])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const token = localStorage.getItem('scanner_token')
      
      if (isOnline) {
        // Pesquisa online
        console.log('🔍 Enviando pesquisa:', { searchTerm: query })
        
        const response = await fetch('/api/scanners/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            query: query 
          })
        })

        console.log('📡 Response pesquisa:', { 
          status: response.status, 
          statusText: response.statusText 
        })

        const data = await response.json()
        console.log('📊 Dados recebidos:', data)

        if (!response.ok) {
          console.error('❌ Erro na resposta:', data)
          throw new Error(data.error || 'Erro na pesquisa')
        }

        console.log('✅ Resultados encontrados:', data.results?.length || 0)
        setSearchResults(data.results || [])
      } else {
        // Pesquisa offline
        const results = searchOffline(query)
        setSearchResults(results)
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao pesquisar convidado')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return
    // A pesquisa já será feita automaticamente pelo debounce
    performSearch(searchTerm.trim())
  }

  const searchOffline = (query: string): SearchResult[] => {
    const cachedGuests = JSON.parse(localStorage.getItem('cached_guests') || '[]')
    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    return cachedGuests
      .filter((guest: any) => {
        const normalizedName = guest.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const normalizedPhone = guest.phone.replace(/\D/g, '')
        const queryNumbers = query.replace(/\D/g, '')

        return normalizedName.includes(normalizedQuery) || 
               (queryNumbers && normalizedPhone.includes(queryNumbers))
      })
      .map((guest: any) => ({
        id: guest.id,
        name: guest.name,
        phone: guest.phone,
        checked_in: guest.checked_in || false,
        check_in_time: guest.check_in_time,
        promoter_name: guest.promoter_name || 'Sem promotor',
        relevance_score: 1
      }))
      .slice(0, 10)
  }

  const handleCheckIn = async (guest: SearchResult) => {
    if (guest.checked_in) return

    try {
      setError('')
      const token = localStorage.getItem('scanner_token')

      if (isOnline) {
        // Check-in online
        const response = await fetch('/api/scanners/scan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            qr_code: guest.id,
            scan_method: 'name_search'
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro no check-in')
        }

        // Atualizar resultado local - usar timestamp do servidor se disponível
        const newCheckInTime = data.check_in_time || new Date().toISOString()
        setSearchResults(prev => 
          prev.map(g => 
            g.id === guest.id 
              ? { ...g, checked_in: true, check_in_time: newCheckInTime }
              : g
          )
        )
      } else {
        // Check-in offline
        processOfflineCheckIn(guest)
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao fazer check-in')
    }
  }

  const processOfflineCheckIn = (guest: SearchResult) => {
    // Salvar na fila de sincronização
    const pendingScans = JSON.parse(localStorage.getItem('pending_scans') || '[]')
    pendingScans.push({
      guest_id: guest.id,
      scan_time: new Date().toISOString(),
      method: 'name_search',
      guest_name: guest.name
    })
    localStorage.setItem('pending_scans', JSON.stringify(pendingScans))

    // Atualizar cache local
    const cachedGuests = JSON.parse(localStorage.getItem('cached_guests') || '[]')
    const updatedGuests = cachedGuests.map((g: any) => 
      g.id === guest.id 
        ? { ...g, checked_in: true, check_in_time: new Date().toISOString() }
        : g
    )
    localStorage.setItem('cached_guests', JSON.stringify(updatedGuests))

    // Atualizar resultado da pesquisa
    setSearchResults(prev => 
      prev.map(g => 
        g.id === guest.id 
          ? { ...g, checked_in: true, check_in_time: new Date().toISOString() }
          : g
      )
    )
  }

  const goBack = () => {
    router.push('/scanner/dashboard')
  }

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state enquanto não montou
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Carregando pesquisa...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              className="text-white hover:bg-indigo-700 p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold">🔍 Pesquisar Convidado</h1>
              <p className="text-indigo-200 text-sm">Cliente esqueceu QR code?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-300" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-300" />
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Search Form */}
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Pesquisa Automática
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />}
            </CardTitle>
            <p className="text-sm text-gray-600">Digite para pesquisar automaticamente</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nome do convidado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 h-12 text-lg"
                  disabled={loading}
                />
              </div>

              {!isOnline && (
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm">
                  🔄 Modo offline - pesquisando em cache local
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Results */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Resultados ({searchResults.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {searchResults.map((guest) => (
                <div 
                  key={guest.id}
                  className={`p-4 border rounded-lg ${
                    guest.checked_in 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-gray-300 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{guest.name}</h3>
                      <div className="flex items-center gap-2 text-gray-600 mt-1">
                        <User className="h-4 w-4" />
                        <span className="text-sm">Promotor: {guest.promoter_name}</span>
                      </div>
                      
                      {guest.checked_in && guest.check_in_time && (
                        <div className="flex items-center gap-2 text-green-600 mt-2">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm">
                            Check-in: {formatTime(guest.check_in_time)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {guest.checked_in ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          ✅ Já entrou
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleCheckIn(guest)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          ✅ Confirmar Entrada
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {searchTerm && !loading && searchResults.length === 0 && searchTerm.length >= 2 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                Nenhum convidado encontrado
              </h3>
              <p className="text-gray-500">
                Tente pesquisar por nome completo ou parte do telefone
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!searchTerm && (
          <Card>
            <CardContent className="p-6 text-center">
              <Search className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Como pesquisar?
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p>📝 Digite o <strong>nome</strong> do convidado</p>
                <p>📞 Ou parte do <strong>número de telefone</strong></p>
                <p>🔍 A pesquisa é inteligente e encontra resultados similares</p>
                {!isOnline && (
                  <p className="text-orange-600">🔄 Funciona mesmo sem internet</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 