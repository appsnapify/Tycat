'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Smartphone, Zap, Wifi, Search } from 'lucide-react'

export default function ScannerLoginPage() {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/scanners/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login')
      }

      // Armazenar dados no localStorage
      localStorage.setItem('scanner_token', data.session_token)
      localStorage.setItem('scanner_data', JSON.stringify(data.scanner))
      localStorage.setItem('event_data', JSON.stringify(data.event))

      // Redirecionar para dashboard
      router.push('/scanner/dashboard')

    } catch (err: any) {
      setError(err.message || 'Erro interno do servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 text-white p-4 rounded-full inline-block mb-4">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎫 SNAP Scanner</h1>
          <p className="text-gray-600">Entrada Rápida para Funcionários</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl text-center">Acesso Scanner</CardTitle>
            <CardDescription className="text-center text-sm">
              Insira suas credenciais para ativar o scanner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="text-sm">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Digite seu username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    username: e.target.value
                  }))}
                  className="h-12 text-lg"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({
                    ...prev,
                    password: e.target.value
                  }))}
                  className="h-12 text-lg"
                  disabled={loading}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-lg bg-indigo-600 hover:bg-indigo-700"
                disabled={loading || !credentials.username || !credentials.password}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Entrando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Entrar no Scanner
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <Smartphone className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Otimizado para telemóvel</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <Wifi className="h-5 w-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Funciona sem internet</p>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm">
            <Search className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Pesquisa por nome</p>
          </div>
        </div>

        {/* Help */}
        <div className="mt-6 text-center">
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">💡 Primeira vez?</p>
            <p className="text-sm text-gray-600">
              Peça o QR code ao organizador do evento
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 