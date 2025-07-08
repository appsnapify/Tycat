'use client';

import React from 'react';
import BottomNav from '@/components/user/BottomNav';
import Header from '@/components/user/Header';
import { useUserAuth } from '@/hooks/useUserAuth';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUserAuth();
  
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        {children}
      </main>
      <BottomNav />
    </div>
  );
} 