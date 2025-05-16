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
export function normalizePhoneNumber(phone: string, defaultCountryCode: string = ''): string {
  // Se o telefone estiver vazio, retornar vazio
  if (!phone || phone.trim() === '') {
    return '';
  }
  
  // Verificar se o telefone já está no formato internacional com prefixo
  if (phone.startsWith('+')) {
    // Remover todos os caracteres não numéricos, exceto o "+"
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Garantir que não haja múltiplos sinais de +
    if (normalized.indexOf('+', 1) > 0) {
      normalized = '+' + normalized.substring(1).replace(/\+/g, '');
    }
    return normalized;
  }
  
  // Se começa com 00 (formato internacional), substituir por +
  if (phone.startsWith('00')) {
    return '+' + phone.substring(2).replace(/[^\d]/g, '');
  }
  
  // Remover caracteres não numéricos para o restante da lógica
  const cleanedPhone = phone.replace(/[^\d]/g, '');
  
  // Se o número já contém o código do país sem o +
  // Ex: 351919999999 -> +351919999999
  if (defaultCountryCode && cleanedPhone.startsWith(defaultCountryCode)) {
    return '+' + cleanedPhone;
  }
  
  // Caso especial para Portugal: números começando com 9 e tendo 9 dígitos
  if (defaultCountryCode === '351' && /^9\d{8}$/.test(cleanedPhone)) {
    return '+351' + cleanedPhone;
  }
  
  // Se não começa com +, adicionar o + e código do país
  if (defaultCountryCode) {
    return '+' + defaultCountryCode + cleanedPhone;
  } else {
    // Quando não temos código do país, apenas adicionar o +
    return '+' + cleanedPhone;
  }
}
