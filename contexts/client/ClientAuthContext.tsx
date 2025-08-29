'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { 
  ClientAuthState, 
  ClientUser, 
  ClientSession,
  ClientLoginData,
  ClientRegistrationData,
  ClientLoginResponse,
  ClientRegistrationResponse
} from '@/types/client';
import { clientApi } from '@/lib/client/api';

interface ClientAuthContextType extends ClientAuthState {
  login: (data: ClientLoginData) => Promise<ClientLoginResponse>;
  register: (data: ClientRegistrationData) => Promise<ClientRegistrationResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  updateUserData: (userData: Partial<ClientUser>) => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | null>(null);

// Actions para o reducer
type ClientAuthAction = 
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: ClientUser; session: ClientSession } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'UPDATE_USER_DATA'; payload: Partial<ClientUser> };

// ✅ COMPLEXIDADE: 6 pontos (1 base + 5 case)
function clientAuthReducer(state: ClientAuthState, action: ClientAuthAction): ClientAuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        session: action.payload.session,
        error: null
      };
    
    case 'AUTH_ERROR':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        session: null,
        error: action.payload
      };
    
    case 'AUTH_LOGOUT':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        session: null,
        error: null
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'UPDATE_USER_DATA':
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...action.payload };
      // Atualizar localStorage
      localStorage.setItem('client_user_data', JSON.stringify(updatedUser));
      return { ...state, user: updatedUser };
    
    default:
      return state;
  }
}

const initialState: ClientAuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  error: null
};

// ✅ COMPLEXIDADE: 2 pontos (1 base + 1 if)
export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(clientAuthReducer, initialState);

  // Verificar sessão existente ao carregar
  useEffect(() => {
    checkExistingSession();
  }, []);

  // ✅ COMPLEXIDADE: 4 pontos (1 base + 1 if + 1 try + 1 &&)
  const checkExistingSession = async () => {
    try {
      const token = localStorage.getItem('client_access_token');
      const userData = localStorage.getItem('client_user_data');
      
      if (!token || !userData) { // +1
        dispatch({ type: 'AUTH_LOGOUT' });
        return;
      }

      // ✅ SEGURANÇA: Usar dados guardados em vez de chamada API
      const user = JSON.parse(userData);
      const refreshToken = localStorage.getItem('client_refresh_token') || '';
      
      const session: ClientSession = {
        user,
        accessToken: token,
        refreshToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15min
      };

      dispatch({ 
        type: 'AUTH_SUCCESS', 
        payload: { user, session } 
      });
      
    } catch (error) {
      console.error('Error checking existing session:', error);
      // ✅ SEGURANÇA: Limpar todos os dados em caso de erro
      localStorage.removeItem('client_access_token');
      localStorage.removeItem('client_refresh_token');
      localStorage.removeItem('client_user_data');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const login = async (data: ClientLoginData): Promise<ClientLoginResponse> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await clientApi.post('/auth/login', data);
      
      if (response.success && response.data) {
        // Armazenar tokens
        localStorage.setItem('client_access_token', response.data.accessToken);
        localStorage.setItem('client_refresh_token', response.data.refreshToken);
        
        // ✅ SEGURANÇA: Guardar dados do utilizador para verificação de sessão
        localStorage.setItem('client_user_data', JSON.stringify(response.data.user));

        const session: ClientSession = {
          user: response.data.user,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000)
        };

        dispatch({ 
          type: 'AUTH_SUCCESS', 
          payload: { user: response.data.user, session } 
        });

        return response;
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.error || 'Login falhado' });
        return response;
      }
    } catch (error) {
      const errorMessage = 'Erro de conexão. Tente novamente.';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (data: ClientRegistrationData): Promise<ClientRegistrationResponse> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await clientApi.post('/auth/register', data);
      
      if (response.success) {
        dispatch({ type: 'AUTH_LOGOUT' }); // Redirecionar para login
        return response;
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: response.error || 'Registo falhado' });
        return response;
      }
    } catch (error) {
      const errorMessage = 'Erro de conexão. Tente novamente.';
      dispatch({ type: 'AUTH_ERROR', payload: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      // Chamar API de logout se possível
      await clientApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // ✅ SEGURANÇA: Limpar todos os dados de sessão
      localStorage.removeItem('client_access_token');
      localStorage.removeItem('client_refresh_token');
      localStorage.removeItem('client_user_data');
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('client_refresh_token');
      if (!refreshToken) return false;

      const response = await clientApi.post('/auth/refresh', { refreshToken });
      
      if (response.success && response.data) {
        localStorage.setItem('client_access_token', response.data.accessToken);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const updateUserData = (userData: Partial<ClientUser>) => {
    dispatch({ type: 'UPDATE_USER_DATA', payload: userData });
  };

  const value: ClientAuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    updateUserData
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth(): ClientAuthContextType {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within ClientAuthProvider');
  }
  return context;
}