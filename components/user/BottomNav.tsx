import React from 'react';
import Link from 'next/link';
import { Home, CalendarDays, UserCircle } from 'lucide-react'; // Exemplo de ícones

const BottomNav: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 border-t border-gray-700 md:hidden">
      <div className="container mx-auto flex justify-around items-center">
        <Link href="/user/dashboard" className="flex flex-col items-center hover:text-lime-400">
          <Home size={24} />
          <span className="text-xs mt-1">Início</span>
        </Link>
        <Link href="/user/dashboard/events" className="flex flex-col items-center hover:text-lime-400">
          <CalendarDays size={24} />
          <span className="text-xs mt-1">Eventos</span>
        </Link>
        <Link href="/user/profile" className="flex flex-col items-center hover:text-lime-400">
          <UserCircle size={24} />
          <span className="text-xs mt-1">Perfil</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav; 