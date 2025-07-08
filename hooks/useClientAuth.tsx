'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { getLoginClienteSupabase } from '../lib/login-cliente/auth-client';
import { ClientUser } from '../types/client';

// Interface para o contexto de autenticação do cliente
interface ClientAuthContextType {
  user: ClientUser | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (user: ClientUser) => Promise<ClientUser>;
  logout: () => Promise<void>;
  checkAuth?: () => Promise<ClientUser | null>;
}

// Criação do contexto com valores padrão
const ClientAuthContext = createContext<ClientAuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  updateUser: () => Promise.resolve({} as ClientUser),
  logout: () => Promise.resolve()
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

  // Referência ao cliente Supabase com proteção SSR - USANDO MESMO CLIENTE DO LOGIN
  const supabaseClientRef = useRef<ReturnType<typeof getLoginClienteSupabase> | null>(null)
  
  // Referência para o timeout de segurança
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Função helper para limpar timeout quando loading finaliza
  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };
  
  // Função para obter cliente de forma lazy e segura para SSR
  const getSupabaseClient = () => {
    // Proteção contra execução no servidor durante SSR
    if (typeof window === 'undefined') return null;
    
    // Lazy loading: só cria o cliente quando necessário
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = getLoginClienteSupabase();
    }
    return supabaseClientRef.current;
  }
  
  // Log apenas uma vez por carregamento da aplicação
  if (process.env.NODE_ENV === 'development' && !providerMounted && typeof window !== 'undefined') {
    console.log('🔥 [CLIENT-AUTH] Provider montado - USANDO CLIENTE DO LOGIN');
    providerMounted = true;
  }
  
  // Efeito para carregar o usuário da sessão ao montar o componente
  useEffect(() => {
    // Função para carregar o usuário da sessão
    const loadUser = async () => {
      try {
        console.log('🔄 [CLIENT-AUTH] Carregando sessão...');
        const supabaseClient = getSupabaseClient();
        
        // Se não há cliente (SSR), pular carregamento
        if (!supabaseClient) {
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
          return;
        }

        // ✅ SIMPLIFICAÇÃO: Carregar sessão uma vez, sem retry complexo
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.error('❌ [CLIENT-AUTH] Erro ao carregar sessão:', error);
          setAuthState({
            user: null,
            isLoading: false,
            error: error.message
          });
          return;
        }
        
        // Se existe sessão, buscar dados na tabela client_users
        if (session && session.user) {
          // ✅ TENTAR AMBOS OS CAMPOS de metadados
          const clientUserId = session.user.user_metadata?.client_user_id || 
                              session.user.raw_user_meta_data?.client_user_id;
          
          if (!clientUserId) {
            // ✅ SIMPLIFICAÇÃO: Tentar apenas um refresh simples
            try {
              await supabaseClient.auth.refreshSession();
              const { data: { session: refreshedSession } } = await supabaseClient.auth.getSession();
              const refreshedUserId = refreshedSession?.user?.user_metadata?.client_user_id || 
                                    refreshedSession?.user?.raw_user_meta_data?.client_user_id;
              
              if (refreshedUserId) {
                // Buscar dados com userId refreshed
                await fetchUserData(supabaseClient, refreshedUserId);
                return;
              }
            } catch (refreshError) {
              console.error('❌ [CLIENT-AUTH] Erro no refresh:', refreshError);
            }
            
            // Se ainda não conseguiu, marcar como não autenticado
            setAuthState({
              user: null,
              isLoading: false,
              error: null
            });
            return;
          }
          
          // ✅ SIMPLIFICAÇÃO: Buscar dados uma vez
          await fetchUserData(supabaseClient, clientUserId);
          return;
        }
        
        // Nenhum usuário encontrado na sessão
        setAuthState({
          user: null,
          isLoading: false,
          error: null
        });
        
      } catch (error) {
        console.error('❌ [CLIENT-AUTH] Erro ao carregar sessão:', error);
        setAuthState({
          user: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    };
    
    // ✅ FUNÇÃO AUXILIAR: Buscar dados do utilizador de forma simples
    const fetchUserData = async (supabaseClient: any, clientUserId: string) => {
      try {
        // ✅ Log simplificado - só quando necessário
        
        const { data: userData, error: clientError } = await supabaseClient
          .from('client_users')
          .select('*')
          .eq('id', clientUserId)
          .single();
          
        if (clientError) {
          console.error('❌ [CLIENT-AUTH] Erro ao buscar dados do utilizador:', clientError);
          setAuthState({
            user: null,
            isLoading: false,
            error: 'Erro ao carregar dados do utilizador'
          });
          return;
        }
        
        if (!userData) {
          console.warn('⚠️ [CLIENT-AUTH] Utilizador não encontrado na tabela');
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
          return;
        }
        
        // ✅ SUCESSO: Normalizar o objeto de usuário
        const clientUser: ClientUser = {
          id: userData.id,
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email || '',
          phone: userData.phone || ''
        };
        
        console.log('✅ [CLIENT-AUTH] Utilizador carregado com sucesso:', clientUser.firstName);
        
        setAuthState({
          user: clientUser,
          isLoading: false,
          error: null
        });
        
      } catch (fetchError) {
        console.error('❌ [CLIENT-AUTH] Erro ao buscar dados:', fetchError);
        setAuthState({
          user: null,
          isLoading: false,
          error: 'Erro ao carregar dados'
        });
      }
    };
    
    // Executar a função de carregar usuário
    loadUser();

    // ✅ TIMEOUT DE SEGURANÇA: Garantir que loading nunca fica permanente
    loadingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ [CLIENT-AUTH] Timeout de carregamento - forçando isLoading: false');
      setAuthState(prevState => ({
        ...prevState,
        isLoading: false,
        error: prevState.error || 'Timeout ao carregar autenticação'
      }));
    }, 10000); // 10 segundos de timeout

    // Configurar listener para mudanças na autenticação
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      return; // SSR safety
    }

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas para eventos importantes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          // ✅ Log simplificado - só quando necessário
        }
        
        if (event === 'SIGNED_IN' && session && session.user) {
          // ✅ DEBUG: Ver estrutura completa dos metadados
          // ✅ Log simplificado - só quando necessário
          
          // ✅ TENTAR AMBOS OS CAMPOS
          const clientUserId = session.user.user_metadata?.client_user_id || 
                              session.user.raw_user_meta_data?.client_user_id;
          
          if (!clientUserId) {
            // ✅ Log simplificado - só quando necessário
            
            // ✅ FORÇAR LOGOUT se sessão inválida
            try {
              await supabaseClient.auth.signOut();
            } catch (signOutError) {
              // ✅ Log simplificado - só quando necessário
            }
            
            // ✅ SEMPRE LIMPAR LOADING
            setAuthState({
              user: null,
              isLoading: false,
              error: null
            });
            return;
          }
          
          // Buscar dados do utilizador de forma simples
          try {
            const { data, error: clientError } = await supabaseClient
              .from('client_users')
              .select('*')
              .eq('id', clientUserId)
              .single();
              
            if (clientError || !data) {
              console.error('❌ [CLIENT-AUTH] Erro ao buscar dados em authChange:', clientError);
              // ✅ SEMPRE LIMPAR LOADING mesmo em caso de erro
              setAuthState({
                user: null,
                isLoading: false,
                error: 'Erro ao carregar dados do utilizador'
              });
              return;
            }
            
            // Normalizar o objeto de usuário
            const clientUser: ClientUser = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email || '',
              phone: data.phone || ''
            };
            
            // ✅ Sucesso: Utilizador carregado
            setAuthState({
              user: clientUser,
              isLoading: false,
              error: null
            });
          } catch (error) {
            console.error('❌ [CLIENT-AUTH] Erro não tratado em authChange:', error);
            // ✅ SEMPRE LIMPAR LOADING mesmo em caso de exceção
            setAuthState({
              user: null,
              isLoading: false,
              error: 'Erro inesperado ao carregar utilizador'
            });
          }
        } else if (event === 'SIGNED_OUT') {
          // ✅ Log simplificado - só quando necessário
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
        }
      }
    );

    // Cleanup: remover listener e timeout ao desmontar
    return () => {
      authListener.subscription.unsubscribe();
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, []);

  // Função para atualizar o usuário no contexto
  const updateUser = (user: ClientUser): Promise<ClientUser> => {
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
    try {
      const supabaseClient = getSupabaseClient();
      
      // Se não há cliente (SSR), retornar null
      if (!supabaseClient) return null;

      // Verificar sessão atual
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('Erro ao verificar sessão:', error);
        return null;
      }
      
      // Se não há sessão, o usuário não está autenticado
      if (!session) {
        return null;
      }
      
      // Se existe sessão, buscar dados na tabela client_users usando metadados
      if (session && session.user) {
        // USAR METADADOS: Buscar pelo client_user_id salvo nos metadados do Auth
        let clientUserId = session.user.user_metadata?.client_user_id || 
                          session.user.raw_user_meta_data?.client_user_id;
        
        // ✅ RETRY se metadados não existirem (pode ser timing issue após login)
        if (!clientUserId) {
          // ✅ Log simplificado - só quando necessário
          
          try {
            await supabaseClient.auth.refreshSession()
            const { data: { session: refreshedSession } } = await supabaseClient.auth.getSession()
            clientUserId = refreshedSession?.user?.user_metadata?.client_user_id || 
                          refreshedSession?.user?.raw_user_meta_data?.client_user_id
            // ✅ Log simplificado - só quando necessário
          } catch (refreshError) {
            console.error('Erro ao refresh da sessão em checkAuth:', refreshError)
          }
        }
        
        if (!clientUserId) {
          console.error('client_user_id não encontrado nos metadados em checkAuth após retry')
          return null;
        }
        
        const { data, error: clientError } = await supabaseClient
          .from('client_users')
          .select('*')
          .eq('id', clientUserId) // Usar o ID dos metadados que é o ID real da tabela
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
  const logout = async (): Promise<void> => {
    // ✅ Log simplificado - só quando necessário
    
    try {
      // Tentar limpar cookies problemáticos antes do logout
      if (typeof window !== 'undefined') {
        // ✅ Log simplificado - só quando necessário
        
        // Limpar cookies Supabase malformados
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') && document.cookie.includes('base64-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            // ✅ Log simplificado - só quando necessário
          }
        });
      }
      
      const supabaseClient = getSupabaseClient();
      
      if (supabaseClient) {
        // ✅ Log simplificado - só quando necessário
        
        // Timeout mais realista para signOut
        const signOutPromise = supabaseClient.auth.signOut();
        const reasonableTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 8000) // ✅ 8s em vez de 2s
        );
        
        try {
          await Promise.race([signOutPromise, reasonableTimeout]);
          // ✅ Log simplificado - só quando necessário
        } catch (signOutError) {
          // ✅ Log simplificado - só quando necessário
        }
      } else {
        // ✅ Log simplificado - só quando necessário
      }
      
      // SEMPRE limpar estado local
      // ✅ Log simplificado - só quando necessário
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      // ✅ Log simplificado - só quando necessário
      
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      
      // FORÇAR limpeza local mesmo com erro
      // ✅ Log simplificado - só quando necessário
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      // ✅ Log simplificado - só quando necessário
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