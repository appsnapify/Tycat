'use client'

import { Home, CalendarDays, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 py-2 px-6 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between">
          {/* Home */}
          <Link
            href="/user/dashboard"
            className={`flex flex-col items-center p-2 ${
              pathname === '/user/dashboard'
                ? 'text-yellow-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Link>

          {/* Eventos (Desabilitado) */}
          <div className="flex flex-col items-center p-2 text-gray-600 cursor-not-allowed">
            <CalendarDays className="w-6 h-6" />
            <span className="text-xs mt-1">Eventos</span>
          </div>

          {/* Perfil (Desabilitado) */}
          <div className="flex flex-col items-center p-2 text-gray-600 cursor-not-allowed">
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Perfil</span>
          </div>
        </div>
      </div>
    </nav>
  )
} 