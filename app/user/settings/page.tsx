'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// ✅ COMPLEXIDADE: 3 pontos (1 base + 2 condições)
export default function ClientSettingsPage() {
  const { user, isLoading, isAuthenticated } = useClientAuth();
  const router = useRouter();

  // ✅ FUNÇÃO: Redirect logic (Complexidade: 2)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) { // +1
      router.push('/user/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // User not authenticated
  if (!isAuthenticated || !user) { // +1
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <ClientSidebar />
      
      {/* Background decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
      </div>

      <div className="relative z-10">
        <div className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto pt-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/user/dashboard">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800 hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              Definições
            </h1>
            <p className="text-slate-600 text-lg">
              Gerencie a sua conta e preferências.
            </p>
          </div>

          {/* Settings Cards */}
          <div className="space-y-6">
            {/* Profile Settings */}
            <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
                  <User className="w-5 h-5 mr-3 text-emerald-600" />
                  Perfil
                </CardTitle>
                <CardDescription>
                  Edite as suas informações pessoais e dados de contacto.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-700">Nome</p>
                      <p className="text-slate-600">{user.first_name} {user.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Telemóvel</p>
                      <p className="text-slate-600">{user.phone}</p>
                    </div>
                    {user.email && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Email</p>
                        <p className="text-slate-600">{user.email}</p>
                      </div>
                    )}
                    {user.birth_date && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Data de Nascimento</p>
                        <p className="text-slate-600">{new Date(user.birth_date).toLocaleDateString('pt-PT')}</p>
                      </div>
                    )}
                    {user.gender && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Género</p>
                        <p className="text-slate-600">
                          {user.gender === 'M' ? 'Masculino' : user.gender === 'F' ? 'Feminino' : 'Outro'}
                        </p>
                      </div>
                    )}
                    {user.city && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Cidade</p>
                        <p className="text-slate-600">{user.city}</p>
                      </div>
                    )}
                    {user.postal_code && (
                      <div>
                        <p className="text-sm font-medium text-slate-700">Código Postal</p>
                        <p className="text-slate-600">{user.postal_code}</p>
                      </div>
                    )}
                  </div>
                  <div className="pt-4">
                    <Link href="/user/settings/edit-profile">
                    <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                      Editar Perfil
                    </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    </div>
  );
}
