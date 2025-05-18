'use client'

import {
  ReactNode,
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Session, SupabaseClient, User, AuthChangeEvent, SignInWithPasswordCredentials, SignUpWithPasswordCredentials } from '@supabase/supabase-js'
// import { getRoleFromClaims } from '@/lib/auth/roles' // Comentado temporariamente
// import { ROLES, PromoterSalesRole } from '@/lib/auth/constants' // Comentado temporariamente
import { Organization } from '@/types/organization'
import { TeamWithMembers } from '@/types/team'
import { Profile } from '@/types/profile'

// Tipos
type MaybeSession = Session | null
type MaybeUser = User | null
// type MaybeRole = PromoterSalesRole | string | null // Comentado temporariamente

// Simulação simples de ROLES e getRoleFromClaims até termos os ficheiros corretos
const ROLES = {
  ORGANIZADOR: 'organizador',
  PROMOTOR: 'promotor',
  CHEFE_EQUIPE: 'chefe-equipe',
  // Adicione outros roles conforme necessário
};

const getRoleFromClaims = (user: User | null): string | null => {
  if (!user) return null;
  // Esta é uma simplificação. A lógica real pode envolver a verificação de app_metadata ou user_metadata
  return user.user_metadata?.role || user.app_metadata?.role || null;
};
// Fim da simulação

interface AuthContextType {
  supabase: SupabaseClient
  session: MaybeSession
  user: MaybeUser
  // currentRole: MaybeRole // Comentado temporariamente
  isLoadingUser: boolean
  initialAuthCheckCompleted: boolean
  signOut: () => Promise<void>
  signIn: (credentials: SignInWithPasswordCredentials) => Promise<{ error: Error | null }>
  signUp: (credentials: SignUpWithPasswordCredentials, metadata?: Record<string, any>) => Promise<{ error: Error | null }>
  // Adicione outros estados e funções que o seu hook useAuth expunha
  // Por exemplo:
  // currentOrganization: Organization | null
  // team: TeamWithMembers | null
  // userProfile: Profile | null
  // isLoadingCurrentOrg: boolean
  // refreshUserProfile: () => Promise<void>
  // setCurrentOrganizationById: (orgId: string | null) => Promise<void>
}

interface ClientAuthProviderProps {
  children: ReactNode
  serverSession: MaybeSession // Para inicialização SSR
}

// Contexto
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
export const ClientAuthProvider: React.FC<ClientAuthProviderProps> = ({
  children,
  serverSession,
}) => {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  const [session, setSession] = useState<MaybeSession>(serverSession)
  const [user, setUser] = useState<MaybeUser>(serverSession?.user ?? null)
  // const [currentRole, setCurrentRole] = useState<MaybeRole>(null) // Comentado temporariamente
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true)
  const [initialAuthCheckCompleted, setInitialAuthCheckCompleted] = useState<boolean>(false)
  // Adicione outros estados conforme necessário
  // const [userProfile, setUserProfile] = useState<Profile | null>(null)
  // const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  // ...

  /* Comentado temporariamente
  const updateRole = useCallback((userInstance: MaybeUser) => {
    if (userInstance) {
      const role = getRoleFromClaims(userInstance)
      setCurrentRole(role)
      console.log('[ClientAuthProvider] Role updated:', role)
    } else {
      setCurrentRole(null)
    }
  }, []) */

  const updateRole = useCallback((userInstance: MaybeUser) => {
    if (userInstance) {
      const role = getRoleFromClaims(userInstance)
      console.log('[ClientAuthProvider] Role updated:', role)
    } else {
      console.log('[ClientAuthProvider] Role updated: null')
    }
  }, [])

  useEffect(() => {
    // Inicializar estado do user e role com base na serverSession
    if (serverSession) {
      setUser(serverSession.user)
      updateRole(serverSession.user)
    }
  }, [serverSession, updateRole]);

  useEffect(() => {
    // Imediatamente marca como carregando até que a primeira verificação de auth ocorra.
    setIsLoadingUser(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('[ClientAuthProvider] Auth event:', event); // Log do evento
        console.log('[ClientAuthProvider] New session user email:', newSession?.user?.email); // Log do email do user
        // console.log('[ClientAuthProvider] New session object:', newSession); // Log completo da sessão (pode ser verboso)
        
        setSession(newSession)
        const newUser = newSession?.user ?? null
        setUser(newUser)
        updateRole(newUser)
        setIsLoadingUser(false) // A carga do usuário terminou após este evento
        setInitialAuthCheckCompleted(true) // A VERIFICAÇÃO INICIAL FOI FEITA

        if (event === 'SIGNED_OUT') {
          // Limpar estados relacionados ao utilizador
          // setUserProfile(null)
          // setCurrentOrganization(null)
          // setCurrentRole(null) // Comentado temporariamente
          // Redirecionar para o login pode ser uma opção, ou deixar a página/layout decidir
          // if (pathname !== '/login' && pathname !== '/register') { // Evitar loop
          //   router.push('/login')
          // }
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Ações adicionais podem ser necessárias aqui, como carregar o perfil do utilizador
        }
      },
    );

    return () => {
      subscription?.unsubscribe()
    }
  }, [supabase, router, updateRole, pathname]);

  const signOut = async () => {
    setIsLoadingUser(true)
    await supabase.auth.signOut()
    // Os listeners de onAuthStateChange já devem limpar os estados session, user e role
    // Redirecionamento explícito se necessário, mas geralmente os componentes protegidos devem reagir à ausência de user/session
    // router.push('/login')
    setIsLoadingUser(false)
  }
  
  // Lógica para carregar perfil, organização, etc., pode ser adicionada aqui
  // Exemplo:
  // const refreshUserProfile = useCallback(async () => {...}, [supabase, user])
  // useEffect(() => {
  //   if (user && !userProfile) {
  //     refreshUserProfile()
  //   }
  // }, [user, userProfile, refreshUserProfile]);

  const signIn = async (credentials: SignInWithPasswordCredentials): Promise<{ error: Error | null }> => {
    setIsLoadingUser(true);
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    
    if (error) {
      console.error('[ClientAuthProvider] SignIn Error:', error);
      setIsLoadingUser(false);
      return { error };
    }

    if (data.user) {
      // onAuthStateChange já deve ter atualizado user, session e role.
      // Mas podemos forçar uma atualização de role aqui se necessário, embora updateRole já seja chamado no listener.
      // updateRole(data.user);
      // const userRole = getRoleFromClaims(data.user) || ROLES.PROMOTOR; // Role padrão se não definido
      // console.log('[ClientAuthProvider] SignIn Success. User role:', userRole);
      
      // Lógica de redirecionamento (simplificada por agora)
      // TODO: Implementar getDashboardUrlByRole e lógica de checkIfTeamLeader de hooks/use-auth.tsx
      // Por agora, redireciona para um dashboard genérico se o user existir
      // O AppLayoutContent também tem lógica de redirecionamento se não houver user.
      // Esta parte pode precisar de mais refinamento para evitar conflitos.
      // router.push('/app/dashboard'); // Placeholder de redirecionamento
      console.log('[ClientAuthProvider] User signed in, onAuthStateChange will handle role and state. Redirection should be handled by page logic or AppLayoutContent based on user state.')
    }
    setIsLoadingUser(false);
    return { error: null }; // Sucesso, onAuthStateChange tratará do resto
  };

  const signUp = async (credentials: SignUpWithPasswordCredentials, metadata?: Record<string, any>): Promise<{ error: Error | null }> => {
    setIsLoadingUser(true);
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.error('[ClientAuthProvider] SignUp Error:', error);
      setIsLoadingUser(false);
      return { error };
    }

    if (data.user) {
      // onAuthStateChange tratará da atualização de estado.
      // Geralmente após o signUp, o utilizador precisa de confirmar o email.
      // Não há redirecionamento automático aqui; a UI deve informar o utilizador.
      console.log('[ClientAuthProvider] User signed up. Confirmation might be needed. User:', data.user);
    }
    setIsLoadingUser(false);
    return { error: null };
  };

  const contextValue = useMemo(
    () => ({
      supabase,
      session,
      user,
      // currentRole, // Comentado temporariamente
      isLoadingUser,
      initialAuthCheckCompleted,
      signOut,
      signIn,
      signUp,
      // Adicione outros valores de contexto
    }),
    // [supabase, session, user, currentRole, isLoadingUser], // currentRole removido
    [supabase, session, user, isLoadingUser, initialAuthCheckCompleted, signOut, signIn, signUp],
  )

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

// Hook para usar o contexto
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within a ClientAuthProvider')
  }
  return context
}

// A lógica de AuthErrorProvider foi removida deste ficheiro para simplificação
// Considere movê-la para um provider dedicado se ainda for necessária 