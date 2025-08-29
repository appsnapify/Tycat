'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, LogOut, User } from 'lucide-react';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import Link from 'next/link';

interface ClientHeaderProps {
  clientUser: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email?: string | null;
  };
}

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 condicional)
export function ClientHeader({ clientUser }: ClientHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { logout } = useClientAuth();

  // ✅ FUNÇÃO: Get initials (Complexidade: 1)
  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/user/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg sm:text-xl">T</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-slate-800">TYCAT</h1>
              <p className="text-xs text-slate-600">Área do Cliente</p>
            </div>
          </Link>

          {/* User Menu */}
          <div className="relative">
            <Button
              variant="ghost"
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 hover:bg-slate-100/80 rounded-xl transition-colors"
            >
              <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                <AvatarImage src="" alt={`${clientUser.first_name} ${clientUser.last_name}`} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold">
                  {getInitials(clientUser.first_name, clientUser.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800">
                  {clientUser.first_name} {clientUser.last_name}
                </p>
                <p className="text-xs text-slate-600">{clientUser.phone}</p>
              </div>
            </Button>

            {/* Dropdown Menu */}
            {showDropdown && ( // +1
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/50 py-2 z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-800">
                    {clientUser.first_name} {clientUser.last_name}
                  </p>
                  <p className="text-xs text-slate-600">{clientUser.phone}</p>
                  {clientUser.email && (
                    <p className="text-xs text-slate-500">{clientUser.email}</p>
                  )}
                </div>
                
                <div className="py-1">
                  <Link
                    href="/user/profile"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <User className="w-4 h-4 mr-3" />
                    Perfil
                  </Link>
                  
                  <Link
                    href="/user/settings"
                    className="flex items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Definições
                  </Link>
                </div>
                
                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Terminar Sessão
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Overlay para fechar dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </header>
  );
}

