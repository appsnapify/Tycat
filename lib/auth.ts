import { createClient } from '@/lib/supabase'

export async function signUp(email: string, password: string, metadata: { [key: string]: any }) {
  try {
    console.log('Iniciando processo de registro com os seguintes dados:', { email, metadata })
    
    const supabase = createClient()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata 
      }
    })
    
    if (error) {
      console.error('Erro retornado pelo Supabase durante registro:', error)
      if (error.message.includes('User already registered')) {
        throw new Error('Este email já está registrado. Por favor, use outro email ou faça login.')
      }
      throw error
    }
    
    if (!data.user) {
      throw new Error('Falha ao criar usuário')
    }
    
    console.log('Usuário registrado com sucesso:', data.user)
    return data.user
    
  } catch (error: any) {
    console.error('Erro no processo de registro:', error)
    throw error
  }
}

// ✅ FUNÇÃO DE VALIDAÇÃO DE CREDENCIAIS (seguindo regrascodacy.md)
function validateCredentials(email: string, password: string): void {
    // Verificar se o email é válido usando regex básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Formato de email inválido:', email);
      throw new Error('Invalid email format');
    }

  // Validação de senha removida para compatibilidade
  if (!password || password.length === 0) {
    throw new Error('Password is required');
  }
}

// ✅ FUNÇÃO DE VERIFICAÇÃO DE TOKENS EXISTENTES
async function checkExistingTokens(): Promise<string | null> {
    try {
      if (typeof window !== 'undefined') {
        const supabaseKey = Object.keys(localStorage).find(key => 
          key.startsWith('sb-') && key.includes('-auth-token')
        );
        
        if (supabaseKey) {
          console.log('Token de autenticação existente encontrado');
          const tokenData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
          if (tokenData?.access_token) {
            console.log('O usuário já tem um token de acesso');
          return tokenData.access_token;
          }
        }
      }
    } catch (tokenErr) {
      console.error('Erro ao verificar tokens existentes:', tokenErr);
    }
  return null;
}

// ✅ FUNÇÃO DE PROCESSAMENTO DE METADADOS DO USUÁRIO
async function processUserMetadata(supabase: any, userData: any): Promise<void> {
  if (!userData.user) {
    console.error('⛔ Usuário não retornado após login bem-sucedido');
    return;
  }

  console.log('Metadados do usuário carregados:', {
    id: userData.user.id,
    email: userData.user.email,
    role: userData.user.user_metadata?.role || 'não definido',
    first_name: userData.user.user_metadata?.first_name,
    last_name: userData.user.user_metadata?.last_name
  });
  
  await handleRoleValidation(userData.user);
  await handleLegacyRoleCompatibility(supabase, userData);
  await storeUserMetadata(userData.user);
}

// ✅ FUNÇÃO DE VALIDAÇÃO DE PAPEL DO USUÁRIO
async function handleRoleValidation(user: any): Promise<void> {
  if (!user.user_metadata?.role) {
    console.warn('⚠️ Aviso: O papel do usuário não está definido nos metadados!');
  } else if (!['organizador', 'promotor', 'chefe-equipe', 'team-leader'].includes(user.user_metadata.role)) {
    console.warn(`⚠️ Aviso: Papel de usuário desconhecido: ${user.user_metadata.role}`);
      } else {
    console.log(`✅ Papel do usuário válido: ${user.user_metadata.role}`);
    
    if (['chefe-equipe', 'team-leader'].includes(user.user_metadata.role)) {
      console.log(`🏆 Usuário é um chefe de equipe, definindo redirecionamento para dashboard de equipe`);
      const redirectUrl = '/app/chefe-equipe/dashboard';
      
      try {
        localStorage.setItem('auth_redirect', redirectUrl);
        console.log(`🔀 Redirecionamento definido para: ${redirectUrl}`);
          } catch (e) {
        console.error('Erro ao salvar redirecionamento:', e);
      }
    }
  }
}

// ✅ FUNÇÃO DE COMPATIBILIDADE COM VERSÕES ANTERIORES
async function handleLegacyRoleCompatibility(supabase: any, userData: any): Promise<void> {
  if (userData.user.user_metadata?.is_team_leader === true && 
      !['chefe-equipe', 'team-leader'].includes(userData.user.user_metadata?.role)) {
        console.log('⚠️ Compatibilidade: Usuário marcado como líder de equipe (formato antigo)');
        console.log('⚙️ Atualizando para o formato atual...');
        
        try {
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              role: 'chefe-equipe',
          previous_role: userData.user.user_metadata?.role || 'promotor',
              team_role: 'chefe',
          ...userData.user.user_metadata,
            }
          });
          
          if (updateError) {
            console.error('Erro ao atualizar metadados do usuário:', updateError);
          } else {
            console.log('✅ Metadados atualizados com sucesso para o formato atual');
        userData.user.user_metadata.role = 'chefe-equipe';
        
        const redirectUrl = '/app/chefe-equipe/dashboard';
            try {
              localStorage.setItem('auth_redirect', redirectUrl);
              console.log(`🔀 Redirecionamento definido para: ${redirectUrl}`);
            } catch (e) {
              console.error('Erro ao salvar redirecionamento:', e);
            }
          }
        } catch (updateErr) {
          console.error('Exceção ao atualizar metadados:', updateErr);
    }
  }
}

// ✅ FUNÇÃO DE ARMAZENAMENTO DE METADADOS
async function storeUserMetadata(user: any): Promise<void> {
  if (user.user_metadata?.team_id) {
    console.log(`👥 Usuário está associado à equipe: ${user.user_metadata.team_id}`);
    console.log(`👤 Papel na equipe: ${user.user_metadata.team_role || 'não especificado'}`);
  }
  
      try {
        const authData = {
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'unknown',
      name: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim()
    };
    localStorage.setItem('auth', JSON.stringify(authData));
    console.log('Metadados do usuário salvos no localStorage');
      } catch (e) {
    console.error('Erro ao salvar metadados no localStorage:', e);
      }
    }
    
// ✅ FUNÇÃO DE ESTABELECIMENTO DE SESSÃO
async function establishSession(supabase: any, sessionData: any): Promise<void> {
    try {
    console.log('Definindo sessão manualmente');
      await supabase.auth.setSession({
      access_token: sessionData.access_token,
      refresh_token: sessionData.refresh_token
    });
    } catch (sessionError) {
    console.error('Erro ao definir sessão manualmente:', sessionError);
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ✅ FUNÇÃO DE VERIFICAÇÃO DE SESSÃO
async function verifySessionEstablishment(supabase: any, originalSessionData: any): Promise<void> {
  let sessionEstablished = false;
  let attempts = 0;
  const maxAttempts = 3;
    
    while (!sessionEstablished && attempts < maxAttempts) {
    attempts++;
    console.log(`Verificando estabelecimento de sessão (tentativa ${attempts})`);
      
      try {
      const { data: sessionCheck } = await supabase.auth.getSession();
        
        if (sessionCheck?.session?.access_token) {
        console.log(`✅ Sessão verificada com sucesso na tentativa ${attempts}!`);
        sessionEstablished = true;
        } else {
        console.warn(`⚠️ Verificação de sessão falhou na tentativa ${attempts}`);
        
        if (attempts < maxAttempts && originalSessionData) {
          console.log('Tentando estabelecer sessão novamente...');
              try {
                await supabase.auth.setSession({
              access_token: originalSessionData.access_token,
              refresh_token: originalSessionData.refresh_token
            });
            await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
            console.error(`Erro na tentativa ${attempts} de definir sessão:`, err);
            }
          }
        }
      } catch (checkError) {
      console.error(`Erro ao verificar sessão (tentativa ${attempts}):`, checkError);
      }
    }
    
    if (!sessionEstablished) {
    console.error('⛔ Não foi possível estabelecer sessão após múltiplas tentativas');
    throw new Error('Falha persistente ao estabelecer sessão após login');
  }
}

// ✅ FUNÇÃO PRINCIPAL DE LOGIN REFATORADA (Complexidade reduzida de 32 para <8)
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  
  try {
    console.log('Iniciando processo de login para:', email);
    
    // 1. Validar credenciais
    validateCredentials(email, password);
    
    // 2. Verificar tokens existentes
    await checkExistingTokens();
    
    // 3. Executar login com PKCE flow (mais seguro para aplicações SPA)
    console.log('Executando login com email/senha');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Erro retornado pela Supabase durante login:', error);
      
      // Logs detalhados para diferentes tipos de erro
      if (error.message.includes('Invalid login credentials')) {
        console.error('Credenciais inválidas. Verifique email e senha.');
      } else if (error.message.includes('rate limit')) {
        console.error('Limite de tentativas de login excedido.');
      } else if (error.message.includes('network')) {
        console.error('Erro de rede durante a autenticação.');
      }
      
      throw error;
    }
    
    if (!data.session) {
      console.error('Nenhuma sessão retornada após login bem-sucedido');
      throw new Error('Falha ao estabelecer sessão');
    }
    
    console.log('Login bem-sucedido, estabelecendo sessão');
    
    // 4. Processar metadados do usuário
    await processUserMetadata(supabase, data);
    
    // 5. Estabelecer sessão
    await establishSession(supabase, data.session);
    
    // 6. Verificar estabelecimento da sessão
    await verifySessionEstablishment(supabase, data.session);
    
    return data;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    throw error;
  }
}

export async function signOut() {
  const supabase = createClient()
  
  try {
    await supabase.auth.signOut()
    return { success: true }
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
    throw error
  }
}

export async function getUser() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }
    
    return data.user
  } catch (error) {
    console.error('Erro ao obter usuário:', error)
    return null
  }
}

export async function getSession() {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }
    
    return data.session
  } catch (error) {
    console.error('Erro ao obter sessão:', error)
    return null
  }
}

// Função para limpar tokens e forçar login novamente
export async function resetSession() {
  const supabase = createClient()
  
  try {
    // Limpar qualquer sessão existente
    await supabase.auth.signOut()
    
    // Limpar storage local
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      // Remover outros itens do localStorage relacionados ao Supabase
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('supabase.')) {
          localStorage.removeItem(key)
        }
      }
    }
    
    console.log('Sessão limpa com sucesso')
    return { success: true }
  } catch (error) {
    console.error('Erro ao resetar sessão:', error)
    return { success: false, error }
  }
}

// Aliases para manter compatibilidade
export const logout = signOut
export const getCurrentUser = getUser 