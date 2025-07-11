'use client'

import { useUser } from '@/hooks/useUser'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

export default function Header() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { user, logout } = useUser()

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
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <header className="bg-gray-900 px-4 py-4 border-b border-gray-800/50">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* User Info - Compacto e Elegante */}
        <div className="flex items-center gap-3">
          {/* Avatar com inicial - Refinado */}
          <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-black font-semibold text-sm">{initial}</span>
          </div>
          <div>
            <div className="text-gray-400 text-xs">Bem-vindo de volta</div>
            <h1 className="text-white font-medium text-base">{firstName}</h1>
          </div>
        </div>
        
        {/* Botão de Logout */}
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all duration-200 disabled:opacity-50"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
} 