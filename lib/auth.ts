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

// Função para fazer login com email e senha
export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  try {
    console.log('Iniciando processo de login para:', email)
    
    // Limpar completamente qualquer estado de autenticação anterior
    // Comentar essa parte para evitar problemas com tokens
    /*
    await supabase.auth.signOut()
    
    // Limpar todos os itens de armazenamento relacionados ao Supabase
    if (typeof window !== 'undefined') {
      // Limpar localStorage
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          console.log(`Removendo item localStorage: ${key}`)
          localStorage.removeItem(key)
        }
      }
      
      // Limpar cookies relacionados à autenticação
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=')
        if (name && (name.trim().startsWith('sb-') || name.trim().startsWith('supabase.'))) {
          console.log(`Removendo cookie: ${name.trim()}`)
          document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        }
      })
    }
    
    // Aguardar um momento para garantir que a limpeza seja concluída
    await new Promise(resolve => setTimeout(resolve, 200))
    */
    
    // Verificar se o email é válido usando regex básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Formato de email inválido:', email);
      throw new Error('Invalid email format');
    }

    // Verificar se a senha tem pelo menos 6 caracteres
    /*
    if (password.length < 6) {
      console.error('Senha muito curta');
      throw new Error('Password must be at least 6 characters long');
    }
    */
    
    // Executar login com PKCE flow (mais seguro para aplicações SPA)
    console.log('Executando login com email/senha')

    // Verificar se o token de autenticação já existe no localStorage
    let existingToken = null;
    try {
      if (typeof window !== 'undefined') {
        // Verificar se há algum token no localStorage
        const supabaseKey = Object.keys(localStorage).find(key => 
          key.startsWith('sb-') && key.includes('-auth-token')
        );
        
        if (supabaseKey) {
          console.log('Token de autenticação existente encontrado');
          const tokenData = JSON.parse(localStorage.getItem(supabaseKey) || '{}');
          if (tokenData?.access_token) {
            existingToken = tokenData.access_token;
            console.log('O usuário já tem um token de acesso');
          }
        }
      }
    } catch (tokenErr) {
      console.error('Erro ao verificar tokens existentes:', tokenErr);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      console.error('Erro retornado pela Supabase durante login:', error)
      
      // Adicionar logs detalhados para diferentes tipos de erro
      if (error.message.includes('Invalid login credentials')) {
        console.error('Credenciais inválidas. Verifique email e senha.')
      } else if (error.message.includes('rate limit')) {
        console.error('Limite de tentativas de login excedido.')
      } else if (error.message.includes('network')) {
        console.error('Erro de rede durante a autenticação.')
      }
      
      throw error
    }
    
    if (!data.session) {
      console.error('Nenhuma sessão retornada após login bem-sucedido')
      throw new Error('Falha ao estabelecer sessão')
    }
    
    console.log('Login bem-sucedido, estabelecendo sessão')
    
    // Verificar e registrar os metadados do usuário
    if (data.user) {
      console.log('Metadados do usuário carregados:', {
        id: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'não definido',
        first_name: data.user.user_metadata?.first_name,
        last_name: data.user.user_metadata?.last_name
      })
      
      // Verificar se o papel está definido corretamente
      if (!data.user.user_metadata?.role) {
        console.warn('⚠️ Aviso: O papel do usuário não está definido nos metadados!')
      } else if (data.user.user_metadata.role !== 'organizador' && 
                data.user.user_metadata.role !== 'promotor' && 
                data.user.user_metadata.role !== 'chefe-equipe' &&
                data.user.user_metadata.role !== 'team-leader') {
        console.warn(`⚠️ Aviso: Papel de usuário desconhecido: ${data.user.user_metadata.role}`)
      } else {
        console.log(`✅ Papel do usuário válido: ${data.user.user_metadata.role}`)
        
        // Se for líder de equipe, definir o redirecionamento automaticamente
        if (data.user.user_metadata.role === 'chefe-equipe' || 
            data.user.user_metadata.role === 'team-leader') {
          console.log("🏆 Usuário é um chefe de equipe, definindo redirecionamento para dashboard de equipe")
          let redirectUrl = '/app/chefe-equipe/dashboard'
          
          // Guardar no localStorage para referência e uso pelo middleware
          try {
            localStorage.setItem('auth_redirect', redirectUrl)
            console.log(`🔀 Redirecionamento definido para: ${redirectUrl}`)
          } catch (e) {
            console.error('Erro ao salvar redirecionamento:', e)
          }
        }
      }
      
      // Verificar compatibilidade com versões anteriores que usavam is_team_leader
      if (data.user.user_metadata?.is_team_leader === true && 
          data.user.user_metadata?.role !== 'chefe-equipe' && 
          data.user.user_metadata?.role !== 'team-leader') {
        console.log('⚠️ Compatibilidade: Usuário marcado como líder de equipe (formato antigo)');
        console.log('⚙️ Atualizando para o formato atual...');
        
        try {
          // Atualizar metadados para usar o padrão atual
          const { error: updateError } = await supabase.auth.updateUser({
            data: {
              role: 'chefe-equipe',
              previous_role: data.user.user_metadata?.role || 'promotor',
              team_role: 'chefe',
              // Manter outros metadados
              ...data.user.user_metadata,
            }
          });
          
          if (updateError) {
            console.error('Erro ao atualizar metadados do usuário:', updateError);
          } else {
            console.log('✅ Metadados atualizados com sucesso para o formato atual');
            
            // Atualizar o objeto de usuário local
            data.user.user_metadata.role = 'chefe-equipe';
            
            // Definir redirecionamento
            let redirectUrl = '/app/chefe-equipe/dashboard';
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
      
      // Verificar se há informações de equipe nos metadados
      if (data.user.user_metadata?.team_id) {
        console.log(`👥 Usuário está associado à equipe: ${data.user.user_metadata.team_id}`)
        console.log(`👤 Papel na equipe: ${data.user.user_metadata.team_role || 'não especificado'}`)
      }
      
      // Armazenar metadados no localStorage para acesso rápido
      try {
        const authData = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'unknown',
          name: `${data.user.user_metadata?.first_name || ''} ${data.user.user_metadata?.last_name || ''}`.trim()
        }
        localStorage.setItem('auth', JSON.stringify(authData))
        console.log('Metadados do usuário salvos no localStorage')
      } catch (e) {
        console.error('Erro ao salvar metadados no localStorage:', e)
      }
    } else {
      console.error('⛔ Usuário não retornado após login bem-sucedido')
    }
    
    // Definir a sessão explicitamente para garantir que está armazenada
    try {
      console.log('Definindo sessão manualmente')
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
      })
    } catch (sessionError) {
      console.error('Erro ao definir sessão manualmente:', sessionError)
    }
    
    // Esperar tempo suficiente para que a sessão seja estabelecida
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Verificar se a sessão foi realmente estabelecida em várias tentativas
    let sessionEstablished = false
    let attempts = 0
    const maxAttempts = 3
    
    while (!sessionEstablished && attempts < maxAttempts) {
      attempts++
      console.log(`Verificando estabelecimento de sessão (tentativa ${attempts})`)
      
      try {
        const { data: sessionCheck } = await supabase.auth.getSession()
        
        if (sessionCheck?.session?.access_token) {
          console.log(`✅ Sessão verificada com sucesso na tentativa ${attempts}!`)
          sessionEstablished = true
        } else {
          console.warn(`⚠️ Verificação de sessão falhou na tentativa ${attempts}`)
          
          if (attempts < maxAttempts) {
            // Tentar estabelecer a sessão novamente
            if (data.session) {
              console.log('Tentando estabelecer sessão novamente...')
              try {
                await supabase.auth.setSession({
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token
                })
                // Aguardar para a próxima verificação
                await new Promise(resolve => setTimeout(resolve, 300))
              } catch (err) {
                console.error(`Erro na tentativa ${attempts} de definir sessão:`, err)
              }
            }
          }
        }
      } catch (checkError) {
        console.error(`Erro ao verificar sessão (tentativa ${attempts}):`, checkError)
      }
    }
    
    if (!sessionEstablished) {
      console.error('⛔ Não foi possível estabelecer sessão após múltiplas tentativas')
      throw new Error('Falha persistente ao estabelecer sessão após login')
    }
    
    return data
  } catch (error) {
    console.error('Erro ao fazer login:', error)
    throw error
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