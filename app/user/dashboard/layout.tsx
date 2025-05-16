'use client';

import React from 'react';
import BottomNav from '@/components/user/BottomNav';
import Header from '@/components/user/Header';
import { useClientAuth } from '@/hooks/useClientAuth';

export default function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useClientAuth();
  
  // O redirecionamento agora é tratado pelo ClientProtectedRoute
  
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <Header 
        userFirstName={user?.firstName} 
        avatarUrl={user?.avatarUrl} 
      />
      <main className="flex-grow">
        {children}
      </main>
      <BottomNav />
    </div>
  );
} 