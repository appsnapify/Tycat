'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ClientUser } from '@/types/client';

// Interface para o contexto de autenticação do cliente
interface ClientAuthContextType {
  user: ClientUser | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (user: ClientUser) => Promise<ClientUser>;
  logout: () => void;
  checkAuth?: () => Promise<ClientUser | null>;
}

// Criação do contexto com valores padrão
const ClientAuthContext = createContext<ClientAuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  updateUser: () => Promise.resolve({} as ClientUser),
  logout: () => {}
});

// Hook para usar o contexto de autenticação
export const useClientAuth = () => useContext(ClientAuthContext);

interface ClientAuthProviderProps {
  children: ReactNode;
  persistSession?: boolean;
}

// Flag global para evitar logs repetitivos
let providerMounted = false;

// Componente Provider para o contexto de autenticação
export const ClientAuthProvider = ({
  children,
  persistSession = false
}: ClientAuthProviderProps) => {
  // Estado para armazenar informações do usuário autenticado
  const [authState, setAuthState] = useState<{
    user: ClientUser | null;
    isLoading: boolean;
    error: string | null;
  }>({
    user: null,
    isLoading: true,
    error: null
  });

  // Referência ao cliente Supabase
  const supabaseClientRef = useRef(createClient())
  
  // Log apenas uma vez por carregamento da aplicação
  if (process.env.NODE_ENV === 'development' && !providerMounted) {
    console.log('ClientAuthProvider montado - modo sem persistência de sessão');
    providerMounted = true;
  }
  
  // Efeito para carregar o usuário da sessão ao montar o componente
  useEffect(() => {
    // Função para carregar o usuário da sessão
    const loadUser = async () => {
      try {
        // Carregar usuário da sessão Supabase
        const { data: { session }, error } = await supabaseClientRef.current.auth.getSession();
        
        if (error) {
          console.error('Erro ao carregar sessão:', error);
          setAuthState({
            user: null,
            isLoading: false,
            error: error.message
          });
          return;
        }
        
        // Se existe sessão, buscar dados na tabela client_users usando o ID do Auth
        if (session && session.user) {
          // CORRIGIDO: Usar diretamente o ID do usuário Auth para buscar na tabela client_users
          const { data, error: clientError } = await supabaseClientRef.current
            .from('client_users')
            .select('*')
            .eq('id', session.user.id) // ID do Auth é o mesmo da tabela client_users
            .single();
            
          if (clientError) {
            console.error('Erro ao buscar dados do usuário:', clientError);
            setAuthState({
              user: null,
              isLoading: false,
              error: clientError.message
            });
            return;
          }
          
          if (data) {
            // Normalizar o objeto de usuário
            const clientUser: ClientUser = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email || '',
              phone: data.phone || ''
            };
            
            // Log apenas quando necessário
            if (process.env.NODE_ENV === 'development') {
              console.log('Usuário carregado da sessão:', clientUser);
            }
            
            setAuthState({
              user: clientUser,
              isLoading: false,
              error: null
            });
            return;
          }
        }
        
        // Nenhum usuário encontrado na sessão
        setAuthState({
          user: null,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Erro não tratado ao carregar sessão:', error);
        setAuthState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    };
    
    // Executar a função de carregar usuário
    loadUser();

    // Configurar listener para mudanças na autenticação
    const { data: authListener } = supabaseClientRef.current.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas para eventos importantes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('Evento de autenticação:', event);
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session && session.user) {
            // CORRIGIDO: Usar diretamente o ID do usuário Auth para buscar na tabela client_users
            const { data, error: clientError } = await supabaseClientRef.current
              .from('client_users')
              .select('*')
              .eq('id', session.user.id) // ID do Auth é o mesmo da tabela client_users
              .single();
              
            if (clientError) {
              console.error('Erro ao buscar dados do usuário após auth change:', clientError);
              setAuthState(prev => ({
                ...prev,
                error: clientError.message
              }));
              return;
            }
            
            if (data) {
              // Normalizar o objeto de usuário
              const clientUser: ClientUser = {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                email: data.email || '',
                phone: data.phone || ''
              };
              
              // Log apenas quando necessário
              if (process.env.NODE_ENV === 'development') {
                console.log('Usuário atualizado após auth change:', clientUser);
              }
              
              setAuthState({
                user: clientUser,
                isLoading: false,
                error: null
              });
              return;
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
        }
      }
    );

    // Cleanup: remover listener ao desmontar
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Função para atualizar o usuário no contexto
  const updateUser = (user: ClientUser): Promise<ClientUser> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Atualizando estado do usuário:', user);
    }
    return new Promise((resolve) => {
      setAuthState(prevState => ({
        ...prevState,
        user
      }));
      
      // Pequeno timeout para garantir que o estado foi atualizado antes de resolver a Promise
      setTimeout(() => {
        resolve(user);
      }, 50);
    });
  };
  
  // Verificar e renovar autenticação
  const checkAuth = async (): Promise<ClientUser | null> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Verificando autenticação atual');
    }
    try {
      // Verificar sessão atual
      const { data: { session }, error } = await supabaseClientRef.current.auth.getSession();
      
      if (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
      }
      
      // Se não há sessão, o usuário não está autenticado
      if (!session) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Nenhuma sessão ativa encontrada');
        }
        return null;
      }
      
      // Se existe sessão, buscar dados na tabela client_users usando o ID do Auth
      if (session && session.user) {
        // CORRIGIDO: Usar diretamente o ID do usuário Auth para buscar na tabela client_users
        const { data, error: clientError } = await supabaseClientRef.current
          .from('client_users')
          .select('*')
          .eq('id', session.user.id) // ID do Auth é o mesmo da tabela client_users
          .single();
      
        if (clientError) {
          console.error('Erro ao buscar dados do usuário:', clientError);
          return null;
        }
      
        if (data) {
          // Normalizar o objeto de usuário
          const clientUser: ClientUser = {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            email: data.email || '',
            phone: data.phone || ''
          };
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Usuário verificado e atualizado:', clientUser);
          }
          
          // Atualizar o estado no contexto
          setAuthState({
            user: clientUser,
            isLoading: false,
            error: null
          });
          
          return clientUser;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return null;
    }
  };
  
  // Função para fazer logout
  const logout = async () => {
    try {
      await supabaseClientRef.current.auth.signOut();
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setAuthState(prev => ({
        ...prev, 
        error: error instanceof Error ? error.message : 'Erro ao fazer logout'
      }));
    }
  };

  // Valores para o contexto
  const value = {
    ...authState,
    updateUser,
    logout,
    checkAuth
  };

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}; 