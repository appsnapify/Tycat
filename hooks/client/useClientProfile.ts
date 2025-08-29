'use client';

import { useState, useCallback } from 'react';
import { ClientUser, UseClientProfileReturn, ClientApiResponse } from '@/types/client';
import { clientProfileApi } from '@/lib/client/api';

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 if)
export function useClientProfile(): UseClientProfileReturn {
  const [profile, setProfile] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (data: Partial<ClientUser>): Promise<ClientApiResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientProfileApi.update(data);
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || 'Erro ao atualizar perfil');
      }
      return response;
    } catch (error) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      console.error('Update profile error:', error);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (
    currentPassword: string, 
    newPassword: string
  ): Promise<ClientApiResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientProfileApi.changePassword({
        currentPassword,
        newPassword
      });
      
      if (!response.success) {
        setError(response.error || 'Erro ao alterar password');
      }
      
      return response;
    } catch (error) {
      const errorMsg = 'Erro de conexão';
      setError(errorMsg);
      console.error('Change password error:', error);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await clientProfileApi.get();
      if (response.success && response.data) {
        setProfile(response.data);
      } else {
        setError(response.error || 'Erro ao carregar perfil');
      }
    } catch (error) {
      setError('Erro de conexão');
      console.error('Refresh profile error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    profile,
    isLoading,
    error,
    updateProfile,
    changePassword,
    refreshProfile
  };
}

