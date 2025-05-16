'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { ClientProtectedRoute } from '@/components/client-auth/RequireClientAuth';

export default function ClientDashboardPage() {
  const router = useRouter();
  const { user, logout } = useClientAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar autenticação já é feito pelo ClientProtectedRoute
    setLoading(false);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/client/auth');
  };

  return (
    <ClientProtectedRoute>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold mb-4">Dashboard do Cliente</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-md text-sm"
          >
            Sair
          </button>
        </div>
        
        {loading ? (
          <div className="text-center">A carregar...</div>
        ) : (
          <div className="grid gap-4">
            <div className="p-4 border rounded-lg bg-white shadow-sm">
              <h2 className="font-medium mb-2">Bem-vindo {user?.firstName || ''}</h2>
              <p className="text-gray-600">
                Aqui irá aparecer o seu conteúdo e funcionalidades.
              </p>
            </div>
            
            {user && (
              <div className="p-4 border rounded-lg bg-white shadow-sm">
                <h2 className="font-medium mb-2">Seus dados</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="font-medium">Nome:</p>
                    <p>{user.firstName} {user.lastName}</p>
                  </div>
                  <div>
                    <p className="font-medium">Telefone:</p>
                    <p>{user.phone}</p>
                  </div>
                  {user.email && (
                    <div className="col-span-2">
                      <p className="font-medium">Email:</p>
                      <p>{user.email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ClientProtectedRoute>
  );
} 