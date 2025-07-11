'use client'

import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import { LogOut, RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, logout } = useClienteIsolado()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
    await logout()
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      setIsLoggingOut(false)
    }
  }

  const firstName = user?.firstName || 'Cliente'

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
            {user?.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <RefreshCw className="w-5 h-5 text-gray-400" />
            )}
          </div>
        <div>
            <h1 className="text-white font-semibold">Olá, {firstName}!</h1>
            <p className="text-gray-400 text-sm">Os teus eventos</p>
          </div>
        </div>
        
        {/* Logout Button */}
          <button 
            onClick={handleLogout}
          disabled={isLoggingOut}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50"
          >
          <LogOut className="w-4 h-4" />
          </button>
      </div>
    </header>
  )
} 