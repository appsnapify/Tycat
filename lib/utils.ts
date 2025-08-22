import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
}

/**
 * Formata uma string de data para o formato localizado
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Formata uma string de horário para o formato localizado
 */
export function formatTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Normaliza um número de telefone, mantendo o formato internacional com o +
 * 
 * Exemplos:
 * "(11) 98765-4321" -> "+5511987654321" (com defaultCountryCode=55)
 * "+351 912 345 678" -> "+351912345678"
 * "00351912345678" -> "+351912345678"
 */
/**
 * Limpa caracteres especiais do telefone
 */
function cleanPhoneNumber(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Normaliza telefone com prefixo +
 */
function normalizeInternationalPhone(phone: string): string {
  let normalized = cleanPhoneNumber(phone);
  
  // Garantir que não haja múltiplos sinais de +
  if (normalized.indexOf('+', 1) > 0) {
    normalized = '+' + normalized.substring(1).replace(/\+/g, '');
  }
  return normalized;
}

/**
 * Adiciona código do país ao telefone
 */
function addCountryCode(cleanedPhone: string, countryCode: string): string {
  if (!countryCode) {
    return '+' + cleanedPhone;
  }
  return '+' + countryCode + cleanedPhone;
}

export function normalizePhoneNumber(phone: string, defaultCountryCode: string = ''): string {
  if (!phone || phone.trim() === '') {
    return '';
  }
  
  // Telefone já no formato internacional
  if (phone.startsWith('+')) {
    return normalizeInternationalPhone(phone);
  }
  
  // Formato internacional com 00
  if (phone.startsWith('00')) {
    return '+' + phone.substring(2).replace(/[^\d]/g, '');
  }
  
  const cleanedPhone = phone.replace(/[^\d]/g, '');
  
  // Número já contém código do país
  if (defaultCountryCode && cleanedPhone.startsWith(defaultCountryCode)) {
    return '+' + cleanedPhone;
  }
  
  // Caso especial Portugal
  if (defaultCountryCode === '351' && /^9\d{8}$/.test(cleanedPhone)) {
    return '+351' + cleanedPhone;
  }
  
  return addCountryCode(cleanedPhone, defaultCountryCode);
}

/**
 * Valida se uma string é um UUID válido
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// 🔒 FUNÇÕES DE SEGURANÇA PARA LOGS
export function maskUserId(userId: string): string {
  if (!userId || userId.length < 8) return '***'
  return userId.substring(0, 8) + '...'
}

export function maskPhone(phone: string): string {
  if (!phone) return '***'
  if (phone.length <= 4) return '***'
  
  // +351919999998 → +351***998
  if (phone.startsWith('+351')) {
    return '+351***' + phone.slice(-3)
  }
  
  // 919999998 → 919***998  
  if (phone.length >= 7) {
    return phone.substring(0, 3) + '***' + phone.slice(-3)
  }
  
  return phone.substring(0, 3) + '***'
}

export function safeLog(message: string, data?: any): void {
  if (data && typeof data === 'object') {
    const safeData = { ...data }
    
    // Mascarar campos sensíveis automaticamente
    if (safeData.userId) safeData.userId = maskUserId(safeData.userId)
    if (safeData.phone) safeData.phone = maskPhone(safeData.phone)
    if (safeData.telemóvel) safeData.telemóvel = maskPhone(safeData.telemóvel)
    if (safeData.telefone) safeData.telefone = maskPhone(safeData.telefone)
    
    console.log(message, safeData)
  } else {
    console.log(message, data)
  }
}
