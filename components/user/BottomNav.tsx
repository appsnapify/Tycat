import React from 'react';
import Link from 'next/link';
import { Home, CalendarDays, UserCircle, QrCode } from 'lucide-react';
import { usePathname } from 'next/navigation';

const BottomNav: React.FC = () => {
  const pathname = usePathname();
  
  const isActive = (path: string) => pathname === path;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-lg text-white p-4 border-t border-gray-800">
      <div className="container mx-auto flex justify-around items-center">
        <Link 
          href="/user/dashboard" 
          className={`flex flex-col items-center transition-colors ${
            isActive('/user/dashboard') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Home size={20} />
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        <Link 
          href="/user/dashboard/events" 
          className={`flex flex-col items-center transition-colors ${
            isActive('/user/dashboard/events') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <CalendarDays size={20} />
          <span className="text-xs mt-1">Eventos</span>
        </Link>
        
        <Link 
          href="/user/dashboard/qr-codes" 
          className={`flex flex-col items-center transition-colors ${
            isActive('/user/dashboard/qr-codes') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <QrCode size={20} />
          <span className="text-xs mt-1">QR Codes</span>
        </Link>
        
        <Link 
          href="/user/dashboard/profile" 
          className={`flex flex-col items-center transition-colors ${
            isActive('/user/dashboard/profile') ? 'text-yellow-500' : 'text-gray-400 hover:text-white'
          }`}
        >
          <UserCircle size={20} />
          <span className="text-xs mt-1">Perfil</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav; 