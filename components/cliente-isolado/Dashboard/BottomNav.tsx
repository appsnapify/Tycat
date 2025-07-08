'use client'

import { Heart, Calendar, Settings } from 'lucide-react'

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        <button className="flex flex-col items-center gap-1 p-2 text-blue-400">
          <Calendar className="w-5 h-5" />
          <span className="text-xs">Eventos</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white transition-colors">
          <Heart className="w-5 h-5" />
          <span className="text-xs">Favoritos</span>
        </button>
        
        <button className="flex flex-col items-center gap-1 p-2 text-gray-400 hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          <span className="text-xs">Perfil</span>
        </button>
      </div>
    </nav>
  )
} 