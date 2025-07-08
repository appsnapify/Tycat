'use client';

import React from 'react';
import { ClienteAuthProvider } from '@/hooks/useClienteIsolado';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClienteAuthProvider>
      {children}
    </ClienteAuthProvider>
  );
} 