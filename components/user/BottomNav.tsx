import React from 'react';
import Link from 'next/link';
import { Home, CalendarDays, UserCircle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { toast } from '@/hooks/use-toast';

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  const handleComingSoon = (feature: string) => {
    toast({
      title: "Em breve",
      description: `${feature} estará disponível em breve.`,
      duration: 2000,
    });
  };
  
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl text-white border-t border-gray-700 rounded-t-2xl shadow-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 4px)' }}
    >
      <div className="flex justify-around items-center py-1 px-2">
        <Link 
          href="/user/dashboard" 
          className={`flex flex-col items-center transition-all duration-300 py-1 px-2 rounded-lg ${
            isActive('/user/dashboard') 
              ? 'text-yellow-500 bg-yellow-500/10' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Home size={14} />
          <span className="text-xs font-medium">Home</span>
        </Link>
        
        <button 
          onClick={() => handleComingSoon('Eventos')}
          className="flex flex-col items-center transition-all duration-300 py-1 px-2 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-white/5 opacity-60"
        >
          <CalendarDays size={14} />
          <span className="text-xs font-medium">Eventos</span>
        </button>
        
        <button 
          onClick={() => handleComingSoon('Perfil')}
          className="flex flex-col items-center transition-all duration-300 py-1 px-2 rounded-lg text-gray-500 hover:text-gray-400 hover:bg-white/5 opacity-60"
        >
          <UserCircle size={14} />
          <span className="text-xs font-medium">Perfil</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav; 