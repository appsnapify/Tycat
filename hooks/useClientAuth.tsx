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

  // Referência ao cliente Supabase com proteção SSR
  const supabaseClientRef = useRef<ReturnType<typeof createClient> | null>(null)
  
  // Função para obter cliente de forma lazy e segura para SSR
  const getSupabaseClient = () => {
    // Proteção contra execução no servidor durante SSR
    if (typeof window === 'undefined') return null;
    
    // Lazy loading: só cria o cliente quando necessário
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }
    return supabaseClientRef.current;
  }
  
  // Log apenas uma vez por carregamento da aplicação
  if (process.env.NODE_ENV === 'development' && !providerMounted && typeof window !== 'undefined') {
    providerMounted = true;
  }
  
  // Efeito para carregar o usuário da sessão ao montar o componente
  useEffect(() => {
    // Função para carregar o usuário da sessão
    const loadUser = async () => {
      try {
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

        // Carregar usuário da sessão Supabase
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
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
          const { data, error: clientError } = await supabaseClient
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
    const supabaseClient = getSupabaseClient();
    if (!supabaseClient) return; // SSR safety

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        // Log apenas para eventos importantes
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          console.log('Evento de autenticação:', event);
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session && session.user) {
            // CORRIGIDO: Usar diretamente o ID do usuário Auth para buscar na tabela client_users
            const { data, error: clientError } = await supabaseClient
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
      
      // Se existe sessão, buscar dados na tabela client_users usando o ID do Auth
      if (session && session.user) {
        // CORRIGIDO: Usar diretamente o ID do usuário Auth para buscar na tabela client_users
        const { data, error: clientError } = await supabaseClient
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
    console.log('🔄 Iniciando processo de logout...');
    
    try {
      // Tentar limpar cookies problemáticos antes do logout
      if (typeof window !== 'undefined') {
        console.log('🔄 Limpando cookies problemáticos...');
        
        // Limpar cookies Supabase malformados
        document.cookie.split(";").forEach(cookie => {
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.includes('supabase') && document.cookie.includes('base64-')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            console.log(`🧹 Cookie problemático removido: ${name}`);
          }
        });
      }
      
      const supabaseClient = getSupabaseClient();
      
      if (supabaseClient) {
        console.log('🔄 Tentando signOut no Supabase com timeout curto...');
        
        // Timeout mais curto para signOut específico
        const signOutPromise = supabaseClient.auth.signOut();
        const quickTimeout = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('SignOut timeout')), 2000)
        );
        
        try {
          await Promise.race([signOutPromise, quickTimeout]);
          console.log('✅ SignOut do Supabase concluído');
        } catch (signOutError) {
          console.log('⚠️ SignOut do Supabase falhou, prosseguindo com limpeza local:', signOutError);
        }
      } else {
        console.log('⚠️ Cliente Supabase não disponível, prosseguindo com limpeza local');
      }
      
      // SEMPRE limpar estado local
      console.log('🔄 Limpando estado local...');
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      console.log('✅ Estado local limpo com sucesso');
      
    } catch (error) {
      console.error('❌ Erro durante logout:', error);
      
      // FORÇAR limpeza local mesmo com erro
      console.log('🔄 Forçando limpeza local após erro...');
      setAuthState({
        user: null,
        isLoading: false,
        error: null
      });
      console.log('✅ Limpeza local forçada concluída');
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