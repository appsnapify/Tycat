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
  signUp: (email: string, password: string, metadata: { [key: string]: any }) => Promise<User | null>
  signIn: (email: string, password: string) => Promise<User | null>
  signOut: () => Promise<void>
  isTeamLeader: boolean
  updateUserRole: (newRole: string) => void
  selectedOrganization: any | null
  setSelectedOrganization: (org: any | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTeamLeader, setIsTeamLeader] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState<any | null>(null)

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
    let isIdentifiedAsLeader = false; // Flag local para rastrear
    let currentUserRole: string | null = null;

    try {
      console.log("[checkIfTeamLeader] Verificando se o usuário é líder de equipe:", userId);
      
      // Criar cliente Supabase para uso nesta função
      const supabase = createClient();
      
      // Primeiro verificar se o usuário já tem metadados que o identificam como líder
      // E obter o role atual
      const { data: userDataWrapper, error: userError } = await supabase.auth.getUser(); // Usar getUser() para obter dados frescos
      const userData = userDataWrapper?.user; // Extrair o objeto user
      
      if (!userError && userData) {
        currentUserRole = normalizeRole(userData.user_metadata?.role); // Guardar role atual normalizado
        console.log(`[checkIfTeamLeader] Role atual nos metadados: ${currentUserRole}`);

        // Verificar metadados para papel compatível com chefe de equipe
        if (currentUserRole === 'chefe-equipe') {
          console.log("[checkIfTeamLeader] Usuário já identificado como líder pelos metadados (role)");
          isIdentifiedAsLeader = true;
          setIsTeamLeader(true);
          updateAuthLocalStorage(userData); // Atualizar localStorage
          // Não precisa retornar aqui, pois pode haver outras verificações
        }
        
        // Verificar também o flag is_team_leader
        if (userData.user_metadata?.is_team_leader === true) {
          console.log("[checkIfTeamLeader] Usuário já identificado como líder pelo flag is_team_leader");
          isIdentifiedAsLeader = true;
          setIsTeamLeader(true);
          // Não precisa retornar aqui
        }
      } else if (userError) {
         console.error("[checkIfTeamLeader] Erro ao obter dados do usuário:", userError);
         // Não podemos determinar o role atual, proceder com cautela
      }
      
      // Se já foi identificado como líder pelos metadados, não precisamos das verificações abaixo
      // a menos que queiramos corrigir/atualizar dados como team_id se faltarem.
      // Por agora, vamos simplificar: se já é líder nos metadados, paramos aqui.
      if (isIdentifiedAsLeader) {
        console.log("[checkIfTeamLeader] Usuário já confirmado como líder via metadados. Finalizando verificação.");
        return true;
      }

      // --- Verificações adicionais apenas se NÃO for líder pelos metadados --- 

      console.log("[checkIfTeamLeader] Usuário não é líder pelos metadados, continuando verificações...");

      // Método mais seguro: verificar se é criador de equipe
      try {
        // Criar cliente Supabase para esta verificação
        // const supabase = createClient(); // Reutilizar cliente já criado
        
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, team_code')
          .eq('created_by', userId)
          .maybeSingle();
        
        if (teamError) {
            console.error("[checkIfTeamLeader] Erro ao consultar teams por created_by:", teamError);
        } else if (teamData) {
          console.log("[checkIfTeamLeader] Usuário é criador de equipe (detectado):", teamData.id);
          setIsTeamLeader(true); // <<< OK: Definir estado local
          
          // *** LÓGICA CONDICIONAL DE ATUALIZAÇÃO ***
          if (currentUserRole === 'promotor') {
            console.log("[checkIfTeamLeader] Role atual é 'promotor'. Atualizando metadados para 'chefe-equipe'.");
            // Se encontrarmos dados de equipe E o user era promotor, atualizar metadados
            const { error: updateError } = await supabase.auth.updateUser({
              data: {
                role: 'chefe-equipe', // <<< Promover para chefe
                team_id: teamData.id,
                team_code: teamData.team_code,
                team_name: teamData.name,
                is_team_leader: true
              }
            });
            
            if (updateError) {
              console.error("[checkIfTeamLeader] Erro ao atualizar metadados para promotor->chefe:", updateError);
            } else {
              console.log("[checkIfTeamLeader] Metadados atualizados (promotor->chefe). Usuário promovido.");
              // Atualizar localStorage com o novo role
              handleLocalStorage('chefe-equipe'); 
            }
          } else {
             console.log(`[checkIfTeamLeader] Usuário criou equipa, mas role atual é '${currentUserRole}' (não promotor). NÃO atualizando metadados.`);
          }
          // --- Fim da Lógica Condicional ---

          return true; // É líder (pelo menos para esta sessão) porque criou equipa
        }
      } catch (teamError) {
        console.warn("[checkIfTeamLeader] Exceção ao verificar se é criador de equipe:", teamError);
      }
      
      // Verificar como membro com papel de líder (método menos preferido)
      // ... (restante da lógica para verificar team_members)

    // Se nenhuma condição acima identificou como líder
    if (!isIdentifiedAsLeader) {
        console.log("[checkIfTeamLeader] Após todas as verificações, usuário NÃO é identificado como líder de equipe.");
        setIsTeamLeader(false);
    }
    return isIdentifiedAsLeader; // Retorna o estado final da verificação

  } catch (error) {
      console.error('[checkIfTeamLeader] Erro GERAL ao verificar se é líder de equipe:', error);
      setIsTeamLeader(false); // Garantir estado falso em caso de erro
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

  // Adicionar função para atualizar organização selecionada
  const updateSelectedOrganization = (org: any | null) => {
    setSelectedOrganization(org)
    if (org) {
      localStorage.setItem('selectedOrganization', JSON.stringify(org))
    } else {
      localStorage.removeItem('selectedOrganization')
    }
  }

  // Carregar organização selecionada do localStorage
  useEffect(() => {
    const savedOrg = localStorage.getItem('selectedOrganization')
    if (savedOrg) {
      setSelectedOrganization(JSON.parse(savedOrg))
    }
  }, [])

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

  const signUp = async (email: string, password: string, metadata: { [key: string]: any }) => {
    try {
      console.log('[signUp] Iniciando processo de registro para:', email, 'com metadados:', metadata)
      
      // Limpar estado anterior
      setUser(null)
      setIsTeamLeader(false)
      
      // Chamar função de registro passando o objeto metadata completo
      const user = await auth.signUp(email, password, metadata) 
      
      // Atualizar estado local
      setUser(user)
      
      console.log('[signUp] Registro bem sucedido para:', email)
      return user
      
    } catch (error: any) {
      console.error('[signUp] Erro durante registro:', error)
      setUser(null)
      setIsTeamLeader(false)
      throw error // Propagar o erro original sem modificá-lo
    }
  }

  const signIn = async (email: string, password: string): Promise<User | null> => {
    console.log(`[signIn] Iniciando processo de login para: ${email}`);
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[signIn] Erro no login:", error.message);
        toast.error(error.message || "Erro ao fazer login");
        setUser(null);
        setIsTeamLeader(false);
        localStorage.removeItem('auth');
        setIsLoading(false); // Definir loading false no erro
        return null;
      }

      if (data.user) {
        console.log(`[signIn] Login API SUCESSO para: ${email}. User ID: ${data.user.id}`);
        // Atualizar estado local PRIMEIRO
        setUser(data.user);
        updateAuthLocalStorage(data.user); // Atualizar localStorage com dados frescos

        // ** CHAMAR checkIfTeamLeader AQUI, como estava antes **
        console.log("[signIn] Chamando checkIfTeamLeader AGORA...");
        try {
            await checkIfTeamLeader(data.user.id); 
            console.log("[signIn] checkIfTeamLeader CONCLUÍDO.");
        } catch (checkError) {
            console.error("[signIn] Erro durante checkIfTeamLeader (não fatal para login):", checkError);
            // Continuar mesmo se houver erro aqui, pois o role principal vem dos metadados
        }

        // Determinar o role a partir dos METADADOS recebidos no login (fonte primária para redirect)
        const loggedInUserRole = normalizeRole(data.user.user_metadata?.role);
        console.log(`[signIn] Role determinado a partir dos metadados do login: ${loggedInUserRole}`);
        
        // Determinar URL e redirecionar usando router.push
        const dashboardUrl = getDashboardUrlByRole(loggedInUserRole);
        console.log(`[signIn] Preparando para redirecionar para: ${dashboardUrl}`);
        router.push(dashboardUrl); // <<< Usar router.push diretamente
        console.log("[signIn] router.push chamado.");
        
        // NÃO definir isLoading false aqui, pois o componente vai desmontar
        return data.user; // Retorna o usuário
      } else {
        console.warn("[signIn] Login retornou sem erro, mas sem dados de usuário.");
        setUser(null);
        setIsTeamLeader(false);
        localStorage.removeItem('auth');
        setIsLoading(false); // Definir loading false
        return null;
      }
    } catch (error: any) {
      console.error("[signIn] Erro GERAL no processo de login:", error);
      toast.error(error.message || "Ocorreu um erro inesperado no login");
      setUser(null);
      setIsTeamLeader(false);
      localStorage.removeItem('auth');
      setIsLoading(false); // Definir loading false no erro geral
      return null;
    } 
    // Remover finally block ou garantir que não define isLoading false se o redirect foi chamado
    /* finally {
      // NÃO definir isLoading como false aqui se router.push foi chamado
      // setIsLoading(false);
      console.log("[signIn] Processo de login finalizado (finally).");
    } */
  };

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
      
      // Código de redirecionamento removido, tratado pelo listener onAuthStateChange
    } catch (error) {
      console.error('Erro ao terminar sessão:', error)
      toast.error('Erro ao terminar sessão.')
      
      // Código de redirecionamento no catch removido
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
    updateUserRole,
    selectedOrganization,
    setSelectedOrganization: updateSelectedOrganization
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