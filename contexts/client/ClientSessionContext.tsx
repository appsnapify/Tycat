'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClientAuth } from './ClientAuthContext';

interface ClientSessionContextType {
  isOnline: boolean;
  lastActivity: Date | null;
  sessionDuration: number;
  updateActivity: () => void;
  startSession: () => void;
  endSession: () => void;
}

const ClientSessionContext = createContext<ClientSessionContextType | null>(null);

// ✅ COMPLEXIDADE: 4 pontos (1 base + 2 useEffect + 1 if)
export function ClientSessionProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useClientAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [lastActivity, setLastActivity] = useState<Date | null>(null);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);

  // Detectar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Tracking de atividade do usuário
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const updateActivity = () => {
      setLastActivity(new Date());
    };

    // Adicionar listeners
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [isAuthenticated]);

  // Calcular duração da sessão
  useEffect(() => {
    if (!sessionStart) return;

    const interval = setInterval(() => {
      setSessionDuration(Date.now() - sessionStart.getTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStart]);

  const updateActivityManual = () => {
    setLastActivity(new Date());
  };

  const startSession = () => {
    const now = new Date();
    setSessionStart(now);
    setLastActivity(now);
  };

  const endSession = () => {
    setSessionStart(null);
    setLastActivity(null);
    setSessionDuration(0);
  };

  const value: ClientSessionContextType = {
    isOnline,
    lastActivity,
    sessionDuration,
    updateActivity: updateActivityManual,
    startSession,
    endSession
  };

  return (
    <ClientSessionContext.Provider value={value}>
      {children}
    </ClientSessionContext.Provider>
  );
}

export function useClientSession(): ClientSessionContextType {
  const context = useContext(ClientSessionContext);
  if (!context) {
    throw new Error('useClientSession must be used within ClientSessionProvider');
  }
  return context;
}

