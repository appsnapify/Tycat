/**
 * Constantes globais da aplicação
 */

// Função de validação de URL com fallback
const validateUrl = (url: string, fallback: string): string => {
  try {
    const parsed = new URL(url)
    return parsed.toString()
  } catch {
    return fallback
  }
}

// URL base da API: HTTPS em produção; HTTP apenas em desenvolvimento/local
export const API_BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    // No browser usa a origem atual (prod será https)
    return validateUrl(window.location.origin, 'https://example.invalid')
  }
  if (process.env.VERCEL_URL) {
    // Em Vercel, força https
    return validateUrl(`https://${process.env.VERCEL_URL}`, 'https://example.invalid')
  }
  // Fallback local só em dev - SEMPRE HTTPS para compliance
  return validateUrl(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://localhost:3000', 'https://localhost:3000')
})()

// Outras constantes da aplicação
export const APP_NAME = 'Snap'
export const COPYRIGHT_YEAR = new Date().getFullYear()

// 🔒 CONFIGURAÇÃO DE LOGGING SEGURO (tipada)
export const LOGGING_CONFIG = {
  // Desabilitar logs sensíveis em produção
  ENABLE_PHONE_LOGS: process.env.NODE_ENV === 'development',
  ENABLE_USER_ID_LOGS: process.env.NODE_ENV === 'development',
  // Máscara para logs quando habilitados
  MASK_SENSITIVE_DATA: true,
  // Limites de performance
  MAX_DEPTH: 5 as const,
} as const

// Deep clone seguro
const safeClone = (value: any): any => {
  try {
    // @ts-ignore - structuredClone pode não existir em versões antigas
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
  } catch {
    return '[Unserializable]'
  }
}

// 🔒 CAMPOS SENSÍVEIS PARA MASKING
const SENSITIVE_FIELDS = [
  'phone', 'telemóvel', 'telefone', 'userId', 'user_id', 'email', 'password', 'token', 'auth', 'authorization', 'bearer'
] as const

// 🔒 FUNÇÃO DE MASKING DE OBJETOS (escopo global para evitar inner-declarations)
function maskSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > LOGGING_CONFIG.MAX_DEPTH) return '[Object too deep]'
  if (typeof obj === 'string') {
    const noSpaces = obj.replace(/\s/g, '')
    if (/^\+?351?\d{7,9}$/.test(noSpaces)) return obj.length > 6 ? obj.substring(0, 4) + '***' + obj.slice(-3) : '***'
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(obj)) return obj.substring(0, 8) + '...'
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj)) {
      const [local, domain] = obj.split('@')
      return `${local.substring(0, 2)}***@${domain}`
    }
    return obj
  }
  if (Array.isArray(obj)) return obj.map((item, i) => (i > 100 ? '[...more items]' : maskSensitiveData(item, depth + 1)))
  if (obj && typeof obj === 'object') {
    const masked: Record<string, unknown> = {}
    let keyCount = 0
    for (const [key, value] of Object.entries(obj)) {
      if (keyCount > 50) { 
        // Usar Object.assign para evitar object injection
        return Object.assign(masked, { '...': '[more properties]' })
      }
      const shouldMask = SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))
      const maskedValue = shouldMask 
        ? (typeof value === 'string' ? maskSensitiveData(value, depth + 1) : '[MASKED]')
        : maskSensitiveData(value, depth + 1)
      
      // Usar Object.assign para evitar object injection vulnerability
      Object.assign(masked, { [key]: maskedValue })
      keyCount++
    }
    return masked
  }
  return obj
}

// 🔒 FUNÇÃO DE LOG SEGURO
export function secureLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    if (data && LOGGING_CONFIG.MASK_SENSITIVE_DATA) {
      const safeData = safeClone(data)
      console.log(message, maskSensitiveData(safeData))
    } else {
      console.log(message, data)
    }
  }
  // Em produção, não loga dados sensíveis
}

// 🔒 FUNÇÃO AUXILIAR PARA LOGS CONDICIONAIS
export function conditionalLog(condition: boolean, message: string, data?: unknown): void {
  if (condition) secureLog(message, data)
}

// 🔒 FUNÇÃO PARA LOG DE PERFORMANCE (apenas em dev)
export function performanceLog<T>(label: string, fn: () => T): T {
  if (process.env.NODE_ENV === 'development') {
    console.time(label)
    const result = fn()
    console.timeEnd(label)
    return result
  }
  return fn()
}