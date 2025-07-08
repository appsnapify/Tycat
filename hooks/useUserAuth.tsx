'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { getLoginClienteSupabase } from '../lib/login-cliente/auth-client';
import { ClientUser } from '../types/client';

// Interface para o contexto de autenticação do sistema USER isolado
interface UserAuthContextType {
  user: ClientUser | null;
  isLoading: boolean;
  error: string | null;
  updateUser: (user: ClientUser) => Promise<ClientUser>;
  logout: () => Promise<void>;
  checkAuth?: () => Promise<ClientUser | null>;
}

// Criação do contexto com valores padrão
const UserAuthContext = createContext<UserAuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  updateUser: () => Promise.resolve({} as ClientUser),
  logout: () => Promise.resolve()
});

// Hook para usar o contexto de autenticação USER
export const useUserAuth = () => useContext(UserAuthContext);

interface UserAuthProviderProps {
  children: ReactNode;
  persistSession?: boolean;
}

// Flag global para evitar logs repetitivos
let userProviderMounted = false;

// Componente Provider para o contexto de autenticação USER ISOLADO
export const UserAuthProvider = ({
  children,
  persistSession = false
}: UserAuthProviderProps) => {
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

  // Referência ao cliente Supabase com proteção SSR
  const supabaseClientRef = useRef<ReturnType<typeof getLoginClienteSupabase> | null>(null)
  
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
  if (process.env.NODE_ENV === 'development' && !userProviderMounted && typeof window !== 'undefined') {
    console.log('🚀 [USER-AUTH] Provider montado - sistema USER isolado');
    userProviderMounted = true;
  }
  
  // Efeito para carregar o usuário da sessão ao montar o componente
  useEffect(() => {
    // Função para carregar o usuário da sessão
    const loadUser = async () => {
      try {
        console.log('🔍 [USER-AUTH] === INICIANDO CARREGAMENTO DE SESSÃO ===');
        const supabaseClient = getSupabaseClient();
        
        // Se não há cliente (SSR), pular carregamento
        if (!supabaseClient) {
          console.log('⚠️ [USER-AUTH] SSR detectado, pulando carregamento');
          setAuthState({
            user: null,
            isLoading: false,
            error: null
          });
          return;
        }

        console.log('📡 [USER-AUTH] Cliente Supabase disponível, verificando sessão...');
        
        // Carregar usuário da sessão Supabase
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.error('❌ [USER-AUTH] Erro ao carregar sessão:', error);
          setAuthState({
            user: null,
            isLoading: false,
            error: error.message
          });
          return;
        }
        
        console.log('🔍 [USER-AUTH] Resposta da sessão:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userId: session?.user?.id,
          hasMetadata: !!session?.user?.user_metadata
        });
        
        // Se existe sessão, buscar dados na tabela client_users usando metadados
        if (session && session.user) {
          console.log('✅ [USER-AUTH] Sessão encontrada, buscando dados do utilizador...');
          
          // USAR METADADOS: Buscar pelo client_user_id salvo nos metadados do Auth
          let clientUserId = session.user.user_metadata?.client_user_id;
          
          console.log('🔍 [USER-AUTH] Metadados disponíveis:', {
            client_user_id: clientUserId,
            allMetadata: session.user.user_metadata
          });
          
          // ✅ RETRY se metadados não existirem (pode ser timing issue após login)
          if (!clientUserId) {
            console.log('⚠️ [USER-AUTH] client_user_id não encontrado, tentando refresh da sessão...')
            
            try {
              console.log('🔄 [USER-AUTH] Executando refreshSession...');
              await supabaseClient.auth.refreshSession()
              const { data: { session: refreshedSession } } = await supabaseClient.auth.getSession()
              clientUserId = refreshedSession?.user?.user_metadata?.client_user_id
              console.log('🔍 [USER-AUTH] Após refresh - client_user_id:', clientUserId ? '✅ encontrado' : '❌ não encontrado')
              
              if (refreshedSession?.user?.user_metadata) {
                console.log('🔍 [USER-AUTH] Metadados após refresh:', refreshedSession.user.user_metadata);
              }
            } catch (refreshError) {
              console.error('❌ [USER-AUTH] Erro ao refresh da sessão:', refreshError)
            }
          }
          
          if (!clientUserId) {
            console.error('💥 [USER-AUTH] CRÍTICO: client_user_id não encontrado nos metadados do usuário após retry');
            console.log('🔍 [USER-AUTH] Dados da sessão atual:', {
              userId: session.user.id,
              email: session.user.email,
              metadata: session.user.user_metadata,
              appMetadata: session.user.app_metadata
            });
            setAuthState({
              user: null,
              isLoading: false,
              error: 'Dados de sessão incompletos - client_user_id ausente'
            });
            return;
          }
          
          console.log('📡 [USER-AUTH] Buscando dados na tabela client_users com ID:', clientUserId);
          
          const { data, error: clientError } = await supabaseClient
            .from('client_users')
            .select('*')
            .eq('id', clientUserId) // Usar o ID dos metadados que é o ID real da tabela
            .single();
            
          if (clientError) {
            console.error('❌ [USER-AUTH] Erro ao buscar dados do usuário:', clientError);
            setAuthState({
              user: null,
              isLoading: false,
              error: clientError.message
            });
            return;
          }
          
          if (data) {
            console.log('✅ [USER-AUTH] Dados do utilizador encontrados:', {
              id: data.id,
              name: `${data.first_name} ${data.last_name}`,
              email: data.email,
              phone: data.phone
            });
            
            // Normalizar o objeto de usuário
            const clientUser: ClientUser = {
              id: data.id,
              firstName: data.first_name,
              lastName: data.last_name,
              email: data.email || '',
              phone: data.phone || ''
            };
            
            console.log('🎉 [USER-AUTH] Utilizador carregado com sucesso:', clientUser.firstName);
            setAuthState({
              user: clientUser,
              isLoading: false,
              error: null
            });
            return;
          } else {
            console.error('❌ [USER-AUTH] Nenhum dado retornado da query client_users');
          }
        }
        
        // Nenhum usuário encontrado na sessão
        console.log('⚠️ [USER-AUTH] Nenhuma sessão ativa encontrada');
        setAuthState({
          user: null,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('💥 [USER-AUTH] Erro não tratado ao carregar sessão:', error);
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
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return; // SSR safety

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas para eventos importantes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('[USER-AUTH] Evento de autenticação:', event);
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session && session.user) {
            console.log('[USER-AUTH] Processando login/refresh...');
            
            // USAR METADADOS: Buscar pelo client_user_id salvo nos metadados do Auth
            let clientUserId = session.user.user_metadata?.client_user_id;
            
            // ✅ RETRY se metadados não existirem (pode ser timing issue após login)
            if (!clientUserId) {
              console.log('[USER-AUTH] client_user_id não encontrado em authChange, tentando refresh...')
              
              try {
                await supabaseClient.auth.refreshSession()
                const { data: { session: refreshedSession } } = await supabaseClient.auth.getSession()
                clientUserId = refreshedSession?.user?.user_metadata?.client_user_id
                console.log('[USER-AUTH] AuthChange sessão refreshada, client_user_id:', clientUserId ? 'encontrado' : 'não encontrado')
              } catch (refreshError) {
                console.error('[USER-AUTH] Erro ao refresh da sessão em authChange:', refreshError)
              }
            }
            
            if (!clientUserId) {
              console.error('[USER-AUTH] client_user_id não encontrado nos metadados após auth change com retry')
              setAuthState(prev => ({
                ...prev,
                error: 'Dados de sessão incompletos'
              }));
              return;
            }
            
            const { data, error: clientError } = await supabaseClient
              .from('client_users')
              .select('*')
              .eq('id', clientUserId) // Usar o ID dos metadados que é o ID real da tabela
              .single();
              
            if (clientError) {
              console.error('[USER-AUTH] Erro ao buscar dados do usuário após auth change:', clientError);
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
              
              setAuthState({
                user: clientUser,
                isLoading: false,
                error: null
              });
              return;
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[USER-AUTH] Processando logout...');
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
    return new Promise((resolve) => {
      console.log('[USER-AUTH] Atualizando utilizador:', user.firstName);
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
      console.log('[USER-AUTH] Verificando autenticação...');
      const supabaseClient = getSupabaseClient();
      
      // Se não há cliente (SSR), retornar null
      if (!supabaseClient) return null;

      // Verificar sessão atual
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error('[USER-AUTH] Erro ao verificar sessão:', error);
        return null;
      }
      
      // Se não há sessão, o usuário não está autenticado
      if (!session) {
        console.log('[USER-AUTH] Nenhuma sessão encontrada em checkAuth');
        return null;
      }
      
      // Se existe sessão, buscar dados na tabela client_users usando metadados
      if (session && session.user) {
        // USAR METADADOS: Buscar pelo client_user_id salvo nos metadados do Auth
        let clientUserId = session.user.user_metadata?.client_user_id;
        
        // ✅ RETRY se metadados não existirem (pode ser timing issue após login)
        if (!clientUserId) {
          console.log('[USER-AUTH] client_user_id não encontrado em checkAuth, tentando refresh...')
          
          try {
            await supabaseClient.auth.refreshSession()
            const { data: { session: refreshedSession } } = await supabaseClient.auth.getSession()
            clientUserId = refreshedSession?.user?.user_metadata?.client_user_id
            console.log('[USER-AUTH] CheckAuth sessão refreshada, client_user_id:', clientUserId ? 'encontrado' : 'não encontrado')
          } catch (refreshError) {
            console.error('[USER-AUTH] Erro ao refresh da sessão em checkAuth:', refreshError)
          }
        }
        
        if (!clientUserId) {
          console.error('[USER-AUTH] client_user_id não encontrado nos metadados em checkAuth após retry')
          return null;
        }
        
        const { data, error: clientError } = await supabaseClient
          .from('client_users')
          .select('*')
          .eq('id', clientUserId) // Usar o ID dos metadados que é o ID real da tabela
          .single();
          
        if (clientError) {
          console.error('[USER-AUTH] Erro ao buscar dados do usuário em checkAuth:', clientError);
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
          
          console.log('[USER-AUTH] Autenticação verificada com sucesso');
          return clientUser;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[USER-AUTH] Erro ao verificar autenticação:', error);
      return null;
    }
  };
  
  // Função para fazer logout ISOLADO
  const logout = async (): Promise<void> => {
    console.log('[USER-AUTH] 🔄 Iniciando processo de logout isolado...');
    
    try {
      // Tentar limpar cookies problemáticos antes do logout
      if (typeof window !== 'undefined') {
        console.log('[USER-AUTH] 🔄 Limpando cookies problemáticos...');
        
        // Limpar cookies Supabase malformados
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') && document.cookie.includes('base64-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            console.log(`[USER-AUTH] 🧹 Cookie problemático removido: ${name}`);
          }
        });
      }
      
      const supabaseClient = getSupabaseClient();
      
      if (supabaseClient) {
        console.log('[USER-AUTH] 🔄 Tentando signOut no Supabase com timeout curto...');
        
        // Timeout mais curto para signOut específico
        const signOutPromise = supabaseClient.auth.signOut();
        const quickTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 2000)
        );
        
        try {
          await Promise.race([signOutPromise, quickTimeout]);
          console.log('[USER-AUTH] ✅ SignOut do Supabase concluído');
        } catch (signOutError) {
          console.log('[USER-AUTH] ⚠️ SignOut do Supabase falhou, prosseguindo com limpeza local:', signOutError);
        }
      } else {
        console.log('[USER-AUTH] ⚠️ Cliente Supabase não disponível, prosseguindo com limpeza local');
      }
      
      // SEMPRE limpar estado local
      console.log('[USER-AUTH] 🔄 Limpando estado local...');
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      console.log('[USER-AUTH] ✅ Estado local limpo com sucesso');
      
    } catch (error) {
      console.error('[USER-AUTH] ❌ Erro durante logout:', error);
      
      // FORÇAR limpeza local mesmo com erro
      console.log('[USER-AUTH] 🔄 Forçando limpeza local após erro...');
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      console.log('[USER-AUTH] ✅ Limpeza local forçada concluída');
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
    <UserAuthContext.Provider value={value}>
      {children}
    </UserAuthContext.Provider>
  );
}; 