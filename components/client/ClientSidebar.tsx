'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, Menu, X, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';

// ✅ COMPLEXIDADE: 4 pontos (1 base + 3 condições)
export function ClientSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { logout, user: clientUser } = useClientAuth();

  // ✅ FUNÇÃO: Handle logout (Complexidade: 2)
  const handleLogout = async () => {
    try {
      console.log('[SIDEBAR] Starting logout...');
      await logout(); // +1
      console.log('[SIDEBAR] Logout completed, redirecting to login...');
      // Usar replace em vez de push para não permitir voltar atrás
      router.replace('/user/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      console.log('[SIDEBAR] Force redirecting to login...');
      router.replace('/user/login'); // +1
    }
  };

  // ✅ FUNÇÃO: Handle settings (Complexidade: 1)
  const handleSettings = () => {
    router.push('/user/settings');
    setIsOpen(false);
  };

  // ✅ FUNÇÃO: Handle dashboard (Complexidade: 1)
  const handleDashboard = () => {
    router.push('/user/dashboard');
    setIsOpen(false);
  };

  return (
    <>
      {/* Header com Menu Button */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg sm:text-xl">T</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-slate-800">TYCAT</h1>
                <p className="text-xs text-slate-600">Área do Cliente</p>
              </div>
            </div>

            {/* Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="bg-white/80 backdrop-blur-sm shadow-lg hover:bg-white"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full bg-white/95 backdrop-blur-md shadow-2xl border-l border-slate-200
        transition-transform duration-300 ease-in-out z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        w-80 md:w-72
      `}>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">
                  {clientUser ? `${clientUser.first_name} ${clientUser.last_name}` : 'Utilizador'}
                </h3>
                <p className="text-xs text-slate-500">Cliente</p>
              </div>
            </div>
            {clientUser?.phone && (
              <p className="text-sm text-slate-600 truncate">
                {clientUser.phone}
              </p>
            )}
            {clientUser?.email && (
              <p className="text-xs text-slate-500 truncate">
                {clientUser.email}
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 h-auto"
              onClick={handleDashboard}
            >
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700">Dashboard</span>
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-slate-200">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 hover:bg-slate-50"
              onClick={handleSettings}
            >
              <Settings className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-medium">Definições</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 hover:bg-red-50 hover:text-red-600 group"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 text-slate-600 group-hover:text-red-600" />
              <span className="text-sm font-medium">Terminar Sessão</span>
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center">
              Sistema de Eventos v2.0
            </p>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

