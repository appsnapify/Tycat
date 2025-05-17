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
import { createBrowserClient } from '@/lib/supabase/client'
import type { Session, SupabaseClient, User, AuthChangeEvent } from '@supabase/supabase-js'
// import { getRoleFromClaims } from '@/lib/auth/roles' // Comentado temporariamente
// import { ROLES, PromoterSalesRole } from '@/lib/auth/constants' // Comentado temporariamente
import { Organization } from '@/types/organization'
import { TeamWithMembers } from '@/types/team'
import { Profile } from '@/types/profile'

// Tipos
type MaybeSession = Session | null
type MaybeUser = User | null
// type MaybeRole = PromoterSalesRole | string | null // Comentado temporariamente

interface AuthContextType {
  supabase: SupabaseClient
  session: MaybeSession
  user: MaybeUser
  // currentRole: MaybeRole // Comentado temporariamente
  isLoadingUser: boolean
  signOut: () => Promise<void>
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
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  const [session, setSession] = useState<MaybeSession>(serverSession)
  const [user, setUser] = useState<MaybeUser>(serverSession?.user ?? null)
  // const [currentRole, setCurrentRole] = useState<MaybeRole>(null) // Comentado temporariamente
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true)
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

  useEffect(() => {
    // Inicializar estado do user e role com base na serverSession
    if (serverSession) {
      setUser(serverSession.user)
      // updateRole(serverSession.user) // Comentado temporariamente
    }
    setIsLoadingUser(false)
  // }, [serverSession, updateRole]); // updateRole removido das dependências
  }, [serverSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        console.log('[ClientAuthProvider] Auth state changed:', event, newSession)
        setSession(newSession)
        const newUser = newSession?.user ?? null
        setUser(newUser)
        // updateRole(newUser) // Comentado temporariamente
        setIsLoadingUser(false)

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
  // }, [supabase, router, updateRole, pathname]); // updateRole removido das dependências
}, [supabase, router, pathname]);

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

  const contextValue = useMemo(
    () => ({
      supabase,
      session,
      user,
      // currentRole, // Comentado temporariamente
      isLoadingUser,
      signOut,
      // Adicione outros valores de contexto
    }),
    // [supabase, session, user, currentRole, isLoadingUser], // currentRole removido
    [supabase, session, user, isLoadingUser],
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