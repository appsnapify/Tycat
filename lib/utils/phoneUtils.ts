/**
 * Utilitário para normalização e validação de números de telefone
 */

/**
 * Normaliza um número de telefone removendo caracteres especiais
 * e lidando com prefixos internacionais
 */
export function normalizePhone(phone: string): string {
  // Remover espaços, traços, parênteses e outros caracteres não numéricos
  let normalizedPhone = phone.replace(/[\s\-()]/g, '');
  
  // Se já começa com +, considerar como formato completo
  if (normalizedPhone.startsWith('+')) {
    return normalizedPhone;
  }
  
  // Se começa com 00, substituir por +
  if (normalizedPhone.startsWith('00')) {
    return '+' + normalizedPhone.substring(2);
  }
  
  // Para números portugueses sem prefixo
  // Verificar se começa com 9 e tem 9 dígitos (formato português típico)
  if (/^9\d{8}$/.test(normalizedPhone)) {
    return '+351' + normalizedPhone;
  }
  
  // Se for um número local com 9 dígitos no total (formato típico PT)
  if (normalizedPhone.length === 9 && /^[1-9]\d{8}$/.test(normalizedPhone)) {
    return '+351' + normalizedPhone;
  }
  
  // Para outros casos, retornar como está
  return normalizedPhone;
}

/**
 * Gera variações possíveis de um número de telefone para comparação
 */
export function getPhoneVariations(phone: string): string[] {
  const normalized = normalizePhone(phone);
  const variations = [normalized];
  
  // Se começa com prefixo de país, adicionar versão sem prefixo
  if (normalized.startsWith('+')) {
    // Extrair apenas os dígitos após o código do país 
    const withoutCountryCode = normalized.replace(/^\+\d{1,4}/, '');
    
    // Adicionar versão sem prefixo
    variations.push(withoutCountryCode);
    
    // Para números portugueses (+351)
    if (normalized.startsWith('+351')) {
      // Se tem 9 dígitos após o código
      if (withoutCountryCode.length === 9) {
        // Adicionar versão sem prefixo
        variations.push(withoutCountryCode);
        
        // Adicionar versão com espaço após prefixo do país
        variations.push('+351 ' + withoutCountryCode);
        
        // Adicionar versão com parênteses ao redor do código do país
        variations.push('(+351)' + withoutCountryCode);
      }
    }
  } 
  // Se não começa com + nem 00
  else if (!normalized.startsWith('+') && !normalized.startsWith('00')) {
    // Adicionar versão com prefixo de Portugal
    variations.push('+351' + normalized);
    
    // Se tem 9 dígitos (provável número PT)
    if (normalized.length === 9) {
      // Com espaço após código do país
      variations.push('+351 ' + normalized);
    }
  }
  
  // Adicionar versão com o número exatamente como foi fornecido (sem normalização)
  if (!variations.includes(phone)) {
    variations.push(phone);
  }
  
  return [...new Set(variations)]; // Remover duplicatas
}

/**
 * Constrói uma string no formato correto para o método .or() do Supabase
 * 
 * NOTA: O método .or() do Supabase espera uma string com o formato:
 * "coluna.operador.valor,coluna.operador.valor"
 * 
 * Por exemplo: "phone.eq.123456789,phone.eq.+351123456789"
 */
export function buildPhoneQuery(phone: string): string {
  const variations = getPhoneVariations(phone);
  console.log('Variações geradas para o telefone:', variations);
  
  return variations
    .map(variation => `phone.eq.${variation}`)
    .join(',');
} 