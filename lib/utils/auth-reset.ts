/**
 * Utilitário para resetar autenticação quando cookies Supabase ficam corrompidos
 * Resolve problema: "Failed to parse cookie string: SyntaxError: Unexpected token 'b'"
 */

// Contador de tentativas de reset para evitar loops infinitos
let resetAttempts = 0;
const MAX_RESET_ATTEMPTS = 3;
const RESET_COOLDOWN = 60000; // 1 minuto
let lastResetTime = 0;

export async function resetSupabaseAuth(): Promise<boolean> {
  const now = Date.now();
  
  // Verificar cooldown
  if (now - lastResetTime < RESET_COOLDOWN) {
    console.warn('🚫 Reset em cooldown, aguarde antes de tentar novamente');
    return false;
  }
  
  // Verificar limite de tentativas
  if (resetAttempts >= MAX_RESET_ATTEMPTS) {
    console.error('🚫 Limite máximo de tentativas de reset atingido');
    return false;
  }
  
  try {
    resetAttempts++;
    lastResetTime = now;
    console.log(`🧹 Iniciando reset completo dos cookies Supabase (tentativa ${resetAttempts}/${MAX_RESET_ATTEMPTS})...`);
    
    // 1. Limpar TODOS os cookies do domínio atual
    const allCookies = document.cookie.split(';');
    const supabaseCookies = allCookies
      .map(cookie => cookie.trim().split('=')[0])
      .filter(name => name && (
        name.includes('supabase') || 
        name.includes('sb-') ||
        name.includes('auth-token') ||
        name.includes('refresh-token')
      ));
    
    console.log('🧹 Cookies Supabase encontrados:', supabaseCookies);

    // Limpar cada cookie com múltiplas estratégias
    supabaseCookies.forEach(name => {
      const variations = [
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`,
        `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict;`,
        `${name}=; Max-Age=0; path=/;`,
        `${name}=; Max-Age=0; path=/; domain=localhost;`,
        `${name}=; Max-Age=0; path=/; domain=${window.location.hostname};`,
        `${name}=; Max-Age=-1; path=/;`
      ];
      
      variations.forEach(variation => {
        document.cookie = variation;
      });
    });

    // 2. Limpar COMPLETAMENTE localStorage
    const localStorageKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('sb-') ||
      key.includes('auth') ||
      key.includes('session') ||
      key.includes('token')
    );
    
    console.log('🧹 LocalStorage keys encontradas:', localStorageKeys);
    localStorageKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    // 3. Limpar COMPLETAMENTE sessionStorage
    const sessionStorageKeys = Object.keys(sessionStorage).filter(key =>
      key.includes('supabase') || 
      key.includes('sb-') ||
      key.includes('auth') ||
      key.includes('session') ||
      key.includes('token')
    );
    
    console.log('🧹 SessionStorage keys encontradas:', sessionStorageKeys);
    sessionStorageKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });

    // 4. Tentar limpar cookies via JavaScript adicional
    try {
      // Forçar limpeza adicional
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('supabase') || name.includes('sb-')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        }
      });
    } catch (e) {
      console.warn('Erro na limpeza adicional de cookies:', e);
    }

    console.log('✅ Reset completo dos cookies Supabase concluído');
    
    // Reset bem-sucedido - resetar contador após sucesso
    setTimeout(() => {
      resetAttempts = Math.max(0, resetAttempts - 1);
    }, 30000); // Reduzir contador após 30s
    
    return true;
  } catch (error) {
    console.error('❌ Erro no reset dos cookies Supabase:', error);
    return false;
  }
}

/**
 * Reset completo incluindo reload da página
 */
export async function forceAuthReset(): Promise<boolean> {
  const success = await resetSupabaseAuth();
  if (success) {
    // Aguardar um momento para os cookies serem limpos
    setTimeout(() => {
      window.location.reload();
    }, 200);
  }
  return success;
}

/**
 * Verificar se há sinais de cookies corrompidos
 */
export function detectCorruptedAuth(): boolean {
  try {
    // Verificar múltiplos sinais de corrupção
    const cookies = document.cookie.split(';');
    let corruptionDetected = false;
    
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name?.includes('supabase') || name?.includes('sb-')) {
        // Verificar formato base64 inválido
        if (value?.startsWith('base64-') && value.length > 10) {
          try {
            const jsonPart = value.substring(7);
            JSON.parse(jsonPart);
          } catch {
            console.warn('🔍 Detected corrupted Supabase cookie:', name);
            corruptionDetected = true;
          }
        }
        
        // Verificar padrões de corrupção conhecidos
        if (value?.includes('Unexpected token') || 
            value?.includes('SyntaxError') ||
            value?.length < 10 ||
            value === 'undefined' ||
            value === 'null') {
          console.warn('🔍 Detected invalid Supabase cookie pattern:', name);
          corruptionDetected = true;
        }
      }
    }
    
    // Verificar localStorage corrompido
    try {
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('sb-')
      );
      
      for (const key of authKeys) {
        const value = localStorage.getItem(key);
        if (value === 'undefined' || value === 'null' || value === '') {
          console.warn('🔍 Detected corrupted localStorage key:', key);
          corruptionDetected = true;
        }
      }
    } catch (e) {
      console.warn('🔍 Error checking localStorage:', e);
      corruptionDetected = true;
    }
    
    return corruptionDetected;
  } catch (error) {
    console.error('Error detecting corrupted auth:', error);
    return false;
  }
}

/**
 * Resetar contador de tentativas (para usar após login bem-sucedido)
 */
export function resetAuthAttempts(): void {
  resetAttempts = 0;
  lastResetTime = 0;
  console.log('🔄 Reset attempts counter cleared');
} 