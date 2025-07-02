'use client';

import React from 'react';
import { ClientAuthProvider } from '../../hooks/useClientAuth';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthProvider persistSession={true}>
      {children}
    </ClientAuthProvider>
  );
} 