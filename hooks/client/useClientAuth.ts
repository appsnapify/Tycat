import { useContext } from 'react';
import { ClientAuthContext } from '@/contexts/client/ClientAuthContext';
import { UseClientAuthReturn } from '@/types/client';

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 if)
export function useClientAuth(): UseClientAuthReturn {
  const context = useContext(ClientAuthContext);
  
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  
  return context;
}

