"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'
import * as auth from '@/lib/auth'
import AuthErrorProvider from '@/app/app/_providers/auth-provider'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  signUp: (email: string, password: string, metadata: {
    first_name: string
    last_name: string
    role: 'organizador' | 'promotor'
    organization?: string
  }) => Promise<User | null>
  signIn: (email: string, password: string) => Promise<User | null>
  signOut: () => Promise<void>
  isTeamLeader: boolean
  updateUserRole: (newRole: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTeamLeader, setIsTeamLeader] = useState(false)

  // Adicionar função para normalizar terminologia entre front-end e banco de dados
  // Isso permite manter compatibilidade com o esquema existente sem refatoração completa
  const normalizeRole = (role: string | null | undefined): string => {
    if (!role) return 'desconhecido';
    
    // Conversão para string e lowercase para comparação mais robusta
    const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
    
    // Versão mais robusta do mapeamento
    if (roleLower === 'promoter') return 'promotor';
    if (roleLower === 'promotor') return 'promotor';
    if (roleLower === 'team-leader') return 'chefe-equipe';
    if (roleLower === 'chefe-equipe') return 'chefe-equipe';
    if (roleLower === 'organizador') return 'organizador';
    if (roleLower === 'organizer') return 'organizador';
    
    console.log(`[normalizeRole] Papel não reconhecido: ${role}, usando valor original`);
    return role; // Se não mapeado, retorna o original
  };
  
  // Função para converter papéis para formato do banco de dados
  const normalizeForDB = (role: string | null | undefined): string => {
    if (!role) return 'promotor'; // Valor padrão para DB
    
    const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
    
    // Mapeamento para o banco de dados
    if (roleLower === 'promotor' || roleLower === 'promoter') return 'promotor';
    if (roleLower === 'chefe-equipe' || roleLower === 'team-leader') return 'chefe-equipe';
    if (roleLower === 'organizador' || roleLower === 'organizer') return 'organizador';
    
    console.log(`[normalizeForDB] Papel não reconhecido: ${role}, usando 'promotor' como padrão`);
    return 'promotor'; // Valor padrão se não reconhecido
  };
  
  // Função para converter papéis para formato do frontend
  const normalizeForFrontend = (role: string | null | undefined): string => {
    if (!role) return 'promotor'; // Valor padrão para frontend
    
    const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
    
    // Mapeamento para o frontend
    if (roleLower === 'promotor' || roleLower === 'promoter') return 'promotor';
    if (roleLower === 'chefe-equipe' || roleLower === 'team-leader') return 'chefe-equipe';
    if (roleLower === 'organizador' || roleLower === 'organizer') return 'organizador';
    
    console.log(`[normalizeForFrontend] Papel não reconhecido: ${role}, usando 'promotor' como padrão`);
    return 'promotor'; // Valor padrão se não reconhecido
  };

  // Helper para obter o URL de dashboard com base no papel
  const getDashboardUrlByRole = (role: string): string => {
    const normalizedRole = normalizeRole(role);
    
    switch (normalizedRole) {
      case 'chefe-equipe':
        return '/app/chefe-equipe/dashboard';
      case 'promotor':
        return '/app/promotor/dashboard';
      case 'organizador':
        return '/app/organizador/dashboard';
      default:
        console.log(`[getDashboardUrlByRole] Papel não reconhecido: ${role}, redirecionando para /app`);
        return '/app';
    }
  };

  // Função para atualizar localStorage com dados de autenticação
  const updateAuthLocalStorage = (userData: any) => {
    try {
      const role = normalizeForFrontend(userData?.user_metadata?.role);
      const teamId = userData?.user_metadata?.team_id;
      const teamCode = userData?.user_metadata?.team_code;
      const teamName = userData?.user_metadata?.team_name;
      
      const authData = {
        role,
        teamId,
        teamCode,
        teamName,
        isTeamLeader: role === 'chefe-equipe',
        timestamp: new Date().toISOString(),
        userId: userData?.id
      };
      
      localStorage.setItem('auth', JSON.stringify(authData));
      console.log("[updateAuthLocalStorage] localStorage atualizado com sucesso:", authData);
      return true;
    } catch (e) {
      console.error("[updateAuthLocalStorage] Erro ao atualizar localStorage:", e);
      return false;
    }
  };

  // Função simplificada para verificar armazenamento local
  const handleLocalStorage = (role: string) => {
    try {
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      authData.role = normalizeForFrontend(role);
      authData.isTeamLeader = normalizeForFrontend(role) === 'chefe-equipe';
      authData.timestamp = new Date().toISOString();
      
      localStorage.setItem('auth', JSON.stringify(authData));
      console.log("[handleLocalStorage] localStorage atualizado com novo papel:", role);
    } catch (e) {
      console.error("[handleLocalStorage] Erro ao manipular localStorage:", e);
    }
  };

  // Função modificada para usar a normalização
  const checkIfTeamLeader = async (userId: string) => {
    try {
      console.log("[checkIfTeamLeader] Verificando se o usuário é líder de equipe:", userId);
      
      // Criar cliente Supabase para uso nesta função
      const supabase = createClient();
      
      // Primeiro verificar se o usuário já tem metadados que o identificam como líder
      const { data: userData, error: userError } = await supabase.auth.getUser(userId);
      
      if (!userError && userData) {
        const userRole = userData.user_metadata?.role;
        const normalizedRole = normalizeRole(userRole);
        
        // Verificar metadados para papel compatível com chefe de equipe
        if (normalizedRole === 'chefe-equipe') {
          console.log("[checkIfTeamLeader] Usuário identificado como líder pelos metadados");
          setIsTeamLeader(true);
          
          // Atualizar localStorage com dados atualizados
          updateAuthLocalStorage(userData);
          
          return true;
        }
        
        // Verificar também o flag is_team_leader
        if (userData.user_metadata?.is_team_leader === true) {
          console.log("[checkIfTeamLeader] Usuário identificado como líder pelo flag is_team_leader");
          setIsTeamLeader(true);
          return true;
        }
      }
      
      // Método mais seguro: verificar se é criador de equipe
      try {
        // Criar cliente Supabase para esta verificação
        const supabase = createClient();
        
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, team_code')
          .eq('created_by', userId)
          .maybeSingle();
        
        if (!teamError && teamData) {
          console.log("[checkIfTeamLeader] Usuário é criador de equipe:", teamData.id);
          setIsTeamLeader(true);
          
          // Se encontrarmos dados de equipe, atualizar os metadados do usuário
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              role: 'chefe-equipe',
              team_id: teamData.id,
              team_code: teamData.team_code,
              team_name: teamData.name,
              is_team_leader: true
            }
          });
          
          if (updateError) {
            console.error("[checkIfTeamLeader] Erro ao atualizar metadados:", updateError);
          } else {
            console.log("[checkIfTeamLeader] Metadados atualizados com informações da equipe");
            
            // Atualizar localStorage
            handleLocalStorage('chefe-equipe');
          }
          
          return true;
        }
      } catch (teamError) {
        console.warn("[checkIfTeamLeader] Erro ao verificar se é criador de equipe:", teamError);
        // Continuar com próximas verificações
      }
      
      // Verificar como membro com papel de líder (método mais propendo a erros de política)
      try {
        // Criar novo cliente Supabase para esta consulta
        const supabase = createClient();
        
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .select('team_id, teams(name, team_code)')
          .eq('user_id', userId)
          .eq('role', 'leader')
          .maybeSingle();
        
        if (memberError) {
          // Verificar se é erro de recursão infinita
          if (memberError.message && memberError.message.includes('infinite recursion')) {
            console.warn("[checkIfTeamLeader] Detectado erro de recursão infinita na política. Dependendo dos metadados.");
            // Se chegamos aqui, o usuário não tem metadados e a verificação falhou
            return false;
          } else if (memberError.code === 'PGRST116') {
            // Não encontrado, não é um erro
            console.log("[checkIfTeamLeader] Usuário não é líder em team_members");
            return false;
          } else {
            throw memberError;
          }
        }
        
        if (memberData && memberData.team_id) {
          console.log("[checkIfTeamLeader] Usuário é líder de equipe:", memberData.team_id);
          setIsTeamLeader(true);
          
          // Dados da equipe obtidos da relação aninhada
          const teamName = memberData.teams?.name || 'Minha Equipe';
          const teamCode = memberData.teams?.team_code || '';
          
          // Atualizar metadados do usuário
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              role: 'chefe-equipe',
              team_id: memberData.team_id,
              team_code: teamCode,
              team_name: teamName,
              is_team_leader: true
            }
          });
          
          if (updateError) {
            console.error("[checkIfTeamLeader] Erro ao atualizar metadados:", updateError);
          } else {
            console.log("[checkIfTeamLeader] Metadados atualizados com informações da equipe");
            
            // Atualizar localStorage
            handleLocalStorage('chefe-equipe');
          }
          
          return true;
        }
      } catch (memberError) {
        console.warn("[checkIfTeamLeader] Erro ao verificar se é líder de equipe na tabela members:", memberError);
      }
      
      console.log("[checkIfTeamLeader] Usuário não é líder de equipe");
      setIsTeamLeader(false);
      return false;
    } catch (error) {
      console.error('[checkIfTeamLeader] Erro ao verificar se é líder de equipe:', error);
      return false;
    }
  };
  
  // Atualizar papel do usuário - versão robusta com normalização
  const updateUserRole = async (newRole: string) => {
    console.log("[updateUserRole] Atualizando papel do usuário para:", newRole);
    
    // Normalizar o papel para garantir consistência
    const normalizedRole = normalizeRole(newRole);
    console.log("[updateUserRole] Papel normalizado:", normalizedRole);
    
    // Atualizar estado interno
    if (normalizedRole === 'chefe-equipe') {
      setIsTeamLeader(true);
    } else {
      setIsTeamLeader(false);
    }
    
    // Atualizar metadata no Supabase
    try {
      const supabase = createClient();
      
      // Primeiro obter metadados atuais para não perder informações
      const { data: currentUser } = await supabase.auth.getUser();
      const currentMetadata = currentUser?.user?.user_metadata || {};
      
      // Verificar se o papel já foi atualizado para evitar atualizações desnecessárias
      if (normalizeRole(currentMetadata.role) === normalizedRole) {
        console.log(`[updateUserRole] Papel já está atualizado para '${normalizedRole}', pulando atualização de metadados`);
        // Neste caso, não precisamos fazer nada adicional
        handleLocalStorage(normalizedRole);
        return;
      }
      
      // Criar objeto de metadados para atualização
      const updatedMetadata = {
        ...currentMetadata,
        role: normalizedRole,
        previous_role: currentMetadata.role || 'promotor',
      };
      
      // Se o novo papel for chefe-equipe, garantir que o flag is_team_leader esteja definido
      if (normalizedRole === 'chefe-equipe') {
        updatedMetadata.is_team_leader = true;
      }
      
      console.log("[updateUserRole] Atualizando metadados do usuário:", updatedMetadata);
      
      const { data: updatedUser, error: metadataError } = await supabase.auth.updateUser({
        data: updatedMetadata
      });
      
      if (metadataError) {
        console.error("[updateUserRole] Erro ao atualizar metadados do usuário:", metadataError);
        throw metadataError;
      } else {
        console.log("[updateUserRole] Metadados do usuário atualizados com sucesso");
        
        // Atualizar localStorage
        handleLocalStorage(normalizedRole);
        
        // Atualizar estado do usuário
        if (updatedUser?.user) {
          setUser(updatedUser.user);
          console.log("[updateUserRole] Usuário atualizado após mudança de papel");
          
          // Forçar refresh da sessão para garantir metadados atualizados
          try {
            await supabase.auth.refreshSession();
            console.log("[updateUserRole] Sessão atualizada após mudança de papel");
          } catch (refreshError) {
            console.warn("[updateUserRole] Erro ao atualizar sessão:", refreshError);
          }
        }
      }
    } catch (e) {
      console.error("[updateUserRole] Exceção ao atualizar metadados:", e);
      throw e;
    }
  };

  useEffect(() => {
    const supabase = createClient()

    // Verificar se há uma sessão ativa
    auth.getSession().then(session => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      // Se houver um usuário logado, verificar se é líder de equipe
      if (currentUser) {
        console.log("Verificando papel de usuário nos metadados:", currentUser.user_metadata);
        
        // Verificação imediata baseada nos metadados
        if (currentUser.user_metadata?.role === 'chefe-equipe' || currentUser.user_metadata?.role === 'team-leader') {
          console.log("Usuário identificado como líder de equipe pelos metadados (role=chefe-equipe)");
          setIsTeamLeader(true);
        } else {
          // Se não estiver nos metadados, fazer verificação completa
          checkIfTeamLeader(currentUser.id);
        }
      }
      
      setIsLoading(false);
    })

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setIsLoading(false)

      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  const signUp = async (email: string, password: string, metadata: {
    first_name: string
    last_name: string
    role: 'organizador' | 'promotor'
    organization?: string
  }) => {
    try {
      const { user } = await auth.signUp(email, password, metadata)
      if (!user) {
        throw new Error('Erro ao criar conta')
      }
      toast.success('Conta criada com sucesso! Por favor, faça login.')
      router.push('/login')
      return user
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      if (error?.message?.includes('email')) {
        throw new Error('Email inválido ou já está em uso')
      }
      throw error
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Mostrar toast de loading
      const toastId = toast.loading('Fazendo login...')
      
      // Chamar a função de login
      const { user } = await auth.signIn(email, password)
      
      // Verificar se o login foi bem-sucedido
      if (!user) {
        toast.dismiss(toastId)
        throw new Error('Credenciais inválidas')
      }
      
      // Atualizar o toast para sucesso
      toast.dismiss(toastId)
      toast.success('Login realizado com sucesso!')
      
      // Determinar para onde redirecionar com base no papel do usuário
      const userRole = normalizeRole(user.user_metadata.role)
      console.log('Papel do usuário detectado:', userRole)
      
      let redirectPath = '/app/promotor/dashboard' // Caminho padrão para promotor
      
      if (userRole === 'organizador') {
        console.log('Usuário é organizador, redirecionando para dashboard de organizador')
        redirectPath = '/app/organizador/dashboard'
      } else if (userRole === 'promotor') {
        console.log('Usuário é promotor, verificando se também é líder de equipe')
        // Verificar se é líder de equipe
        const isLeader = await checkIfTeamLeader(user.id)
        
        // Se for líder de equipe, ir para o dashboard de chefe
        if (isLeader) {
          console.log('Usuário é líder de equipe, redirecionando para dashboard de chefe')
          redirectPath = '/app/chefe-equipe/dashboard'
        } else {
          console.log('Usuário é apenas promotor, redirecionando para dashboard de promotor')
          redirectPath = '/app/promotor/dashboard' // Garantir que vá para o dashboard de promotor
        }
      } else if (userRole === 'chefe-equipe') {
        console.log('Usuário é chefe de equipe, redirecionando para dashboard de chefe')
        redirectPath = '/app/chefe-equipe/dashboard'
      } else {
        console.warn('Papel de usuário desconhecido:', userRole)
      }
      
      console.log(`Login bem-sucedido, redirecionando para ${redirectPath}`)
      
      // Armazenar o papel atual no localStorage para referência rápida
      try {
        const authData = {
          role: userRole,
          userId: user.id
        }
        localStorage.setItem('auth', JSON.stringify(authData))
      } catch (e) {
        console.error('Erro ao armazenar papel no localStorage:', e)
      }
      
      // Dar tempo para a sessão ser completamente estabelecida antes de redirecionar
      setTimeout(() => {
        // Usar window.location para garantir um redirecionamento completo
        window.location.href = redirectPath
      }, 2000)
      
      return user
    } catch (error: any) {
      console.error('Erro durante o processo de login:', error)
      
      // Tratar tipos específicos de erro
      if (error?.message?.includes('Invalid login credentials') || 
          error?.message?.includes('invalid login credentials') || 
          error?.message?.includes('Invalid user credentials')) {
        toast.error('Email ou senha incorretos')
        throw new Error('Email ou senha incorretos')
      } else if (error?.message?.includes('rate limit') || 
                error?.message?.includes('Rate limit')) {
        toast.error('Muitas tentativas de login. Tente novamente em alguns instantes.')
        throw new Error('Limite de tentativas excedido. Aguarde alguns minutos.')
      } else if (error?.message?.includes('Invalid email')) {
        toast.error('O email informado não é válido')
        throw new Error('Email inválido')
      } else if (error?.message?.includes('network')) {
        toast.error('Erro de conexão. Verifique sua internet.')
        throw new Error('Erro de conexão')
      } else {
        toast.error('Falha no login. Por favor, tente novamente.')
        throw error
      }
    }
  }

  const signOut = async () => {
    try {
      // Usar o cliente Supabase para logout
      const supabase = createClientComponentClient()
      await supabase.auth.signOut()
      
      // Limpar localStorage
      try {
        localStorage.removeItem('auth')
      } catch (e) {
        console.error('Erro ao limpar localStorage:', e)
      }
      
      toast.success('Sessão terminada com sucesso!')
      
      // Forçar redirecionamento para a página de login
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
    } catch (error) {
      console.error('Erro ao terminar sessão:', error)
      toast.error('Erro ao terminar sessão.')
      
      // Mesmo com erro, tentar redirecionar
      router.push('/login')
      throw error
    }
  }

  const value = {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    isTeamLeader,
    updateUserRole
  }

  return (
    <AuthContext.Provider value={value}>
      <AuthErrorProvider>
        {children}
      </AuthErrorProvider>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 