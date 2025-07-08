'use client'

import { useClienteIsolado } from '@/hooks/useClienteIsolado'
import { Settings, LogOut } from 'lucide-react'

export default function Header() {
  const { user, logout } = useClienteIsolado()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Olá, {user?.firstName}!</h1>
          <p className="text-sm text-gray-400">Os teus eventos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors">
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
} 