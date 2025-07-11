/**
 * Constantes globais da aplicação
 */

// URL base da API - usando o valor de window.location.origin quando disponível
export const API_BASE_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : 'http://localhost:3000';

// Outras constantes da aplicação podem ser adicionadas aqui
export const APP_NAME = 'Snap';
export const COPYRIGHT_YEAR = new Date().getFullYear();

// JWT Configuration - Comentado pois o sistema JWT personalizado foi desativado
// export const JWT_SECRET = process.env.JWT_SECRET || '6789a37f8e04498ea57fae6c19371cfbc9d45a0e67d24a2fa60d89b8d8f5c6db';
// export const JWT_EXPIRY = '7d'; // 7 dias 

// 🔒 CONFIGURAÇÃO DE LOGGING SEGURO
export const LOGGING_CONFIG = {
  // Desabilitar logs sensíveis em produção
  ENABLE_PHONE_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_USER_ID_LOGS: process.env.NODE_ENV === 'development',
  
  // Máscara para logs quando habilitados
  MASK_SENSITIVE_DATA: true
}

// 🔒 FUNÇÃO DE LOG SEGURO
export function secureLog(message: string, data?: any): void {
  if (process.env.NODE_ENV === 'development') {
    if (data && LOGGING_CONFIG.MASK_SENSITIVE_DATA) {
      // Mascarar dados sensíveis automaticamente
      const safeData = JSON.parse(JSON.stringify(data))
      
      // Lista de campos a mascarar
      const sensitiveFields = ['phone', 'telemóvel', 'telefone', 'userId', 'user_id', 'email']
      
      function maskObject(obj: any): any {
        if (typeof obj === 'string') {
          // Mascarar se parece com telefone
          if (/^\+?351?\d{7,9}$/.test(obj.replace(/\s/g, ''))) {
            return obj.substring(0, 4) + '***' + obj.slice(-3)
          }
          // Mascarar se parece com UUID
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obj)) {
            return obj.substring(0, 8) + '...'
          }
          return obj
        }
        
        if (Array.isArray(obj)) {
          return obj.map(maskObject)
        }
        
        if (obj && typeof obj === 'object') {
          const masked: any = {}
          for (const [key, value] of Object.entries(obj)) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
              masked[key] = maskObject(value)
            } else {
              masked[key] = maskObject(value)
            }
          }
          return masked
        }
        
        return obj
      }
      
      console.log(message, maskObject(safeData))
    } else {
      console.log(message, data)
    }
  }
  // Em produção, não loga dados sensíveis
} 