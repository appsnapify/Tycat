'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { ClientUpcomingEvents } from '@/components/client/ClientUpcomingEventsNew';
import { ClientPastEventsCollapsible } from '@/components/client/ClientPastEventsCollapsible';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import { Skeleton } from '@/components/ui/skeleton';

// ✅ COMPLEXIDADE: 3 pontos (1 base + 2 condições)
export default function ClientDashboardPage() {
  const { user, isLoading, isAuthenticated } = useClientAuth();
  const router = useRouter();

  // ✅ FUNÇÃO: Redirect logic (Complexidade: 2)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) { // +1
      router.push('/user/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Loading state
  if (isLoading) { // +1
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Header Skeleton */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center space-x-4">
              <Skeleton className="w-12 h-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>
          
          {/* Content Skeletons */}
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // User not authenticated
  if (!isAuthenticated || !user) { // +1
    return null; // Will redirect in useEffect
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
        <div className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-4xl mx-auto space-y-8 pt-8">
          {/* Welcome Message */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              Bem-vindo, {user.first_name}! 👋
            </h1>
            <p className="text-slate-600 text-lg">
              Gerencie os seus eventos e QR codes numa só plataforma.
            </p>
          </div>

          {/* Main Content */}
          <ClientUpcomingEvents clientUserId={user.id} />
          <ClientPastEventsCollapsible clientUserId={user.id} />
        </div>
      </div>
    </div>
  );
}