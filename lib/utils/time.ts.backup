/**
 * Utilitários para formatação de horários com timezone correto para Portugal
 */

/**
 * Formata um timestamp para horário local de Portugal (HH:mm)
 * @param timestamp - String ISO ou Date object
 * @returns String formatado como "HH:mm" ou "Horário não disponível" se inválido
 */
export function formatPortugalTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'Horário não disponível'
  
  // 🛡️ PROTEÇÃO: Se já é uma mensagem de erro, retornar sem processar
  if (typeof timestamp === 'string' && (
    timestamp.includes('Horário') || 
    timestamp.includes('inválido') || 
    timestamp.includes('Erro') ||
    timestamp.length < 10 // Timestamps ISO têm pelo menos 10 caracteres
  )) {
    return timestamp
  }
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    if (isNaN(date.getTime())) {
      // 🔇 Não fazer log em desenvolvimento para evitar spam na consola
      return 'Horário inválido'
    }
    
    return date.toLocaleTimeString('pt-PT', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Lisbon'
    })
  } catch (error) {
    console.error('Error formatting Portugal time:', error)
    return 'Erro no horário'
  }
}

/**
 * Formata um timestamp para data e hora completas de Portugal
 * @param timestamp - String ISO ou Date object  
 * @returns String formatado como "dd/MM/yyyy às HH:mm"
 */
export function formatPortugalDateTime(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'Data não disponível'
  
  try {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
    
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp provided to formatPortugalDateTime:', timestamp)
      return 'Data inválida'
    }
    
    return date.toLocaleString('pt-PT', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Lisbon'
    })
  } catch (error) {
    console.error('Error formatting Portugal datetime:', error)
    return 'Erro na data'
  }
}

/**
 * Obtem a hora atual de Portugal como string ISO
 * Útil para gravar timestamps consistentes na BD
 * @returns String ISO timestamp atual de Portugal
 */
export function getCurrentPortugalTime(): string {
  const now = new Date()
  // Criar uma data que representa o momento atual em Portugal
  const portugalDate = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Lisbon"}))
  return portugalDate.toISOString()
}

/**
 * Verifica se uma data está no mesmo dia (timezone Portugal)
 * @param date1 - Primeira data
 * @param date2 - Segunda data (opcional, default: hoje)
 * @returns true se as datas estão no mesmo dia
 */
export function isSamePortugalDay(
  date1: string | Date, 
  date2: string | Date = new Date()
): boolean {
  try {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2
    
    const portugal1 = d1.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' })
    const portugal2 = d2.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' })
    
    return portugal1 === portugal2
  } catch (error) {
    console.error('Error comparing Portugal days:', error)
    return false
  }
}

/**
 * Valida se um timestamp é válido e seguro para uso
 * @param timestamp - String timestamp para validar
 * @returns true se o timestamp é válido
 */
export function isValidTimestamp(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false
  if (typeof timestamp !== 'string') return false
  if (timestamp.length < 10) return false // Timestamps ISO têm pelo menos 10 caracteres
  if (timestamp.includes('Horário') || 
      timestamp.includes('inválido') || 
      timestamp.includes('Erro')) return false
  
  // Tentar criar uma data para verificar se é válida
  try {
    const date = new Date(timestamp)
    return !isNaN(date.getTime())
  } catch {
    return false
  }
} 