'use client'

import React from 'react';
import { Home, CalendarDays, UserCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname.includes('dashboard');
  
  const handleComingSoon = (feature: string) => {
    toast({
      title: "Em breve",
      description: `${feature} estará disponível em breve.`,
      duration: 2000,
    });
  };
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl text-white border-t border-gray-700 rounded-t-2xl shadow-2xl z-50"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
    >
      <div className="flex justify-around items-center py-2 px-2">
        <div className="flex flex-col items-center transition-all duration-300 py-2 px-3 rounded-lg text-yellow-400 bg-yellow-400/15 shadow-lg">
          <Home size={18} />
          <span className="text-xs font-semibold mt-1">Home</span>
        </div>
        
        <button 
          onClick={() => handleComingSoon('Eventos')}
          className="flex flex-col items-center transition-all duration-300 py-2 px-3 rounded-lg text-gray-700 opacity-30 cursor-not-allowed"
          disabled
        >
          <CalendarDays size={18} />
          <span className="text-xs font-medium mt-1">Eventos</span>
        </button>
        
        <button 
          onClick={() => handleComingSoon('Perfil')}
          className="flex flex-col items-center transition-all duration-300 py-2 px-3 rounded-lg text-gray-700 opacity-30 cursor-not-allowed"
          disabled
        >
          <UserCircle size={18} />
          <span className="text-xs font-medium mt-1">Perfil</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav; 