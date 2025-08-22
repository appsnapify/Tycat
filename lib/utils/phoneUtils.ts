/**
 * Utilitário para normalização e validação de números de telefone
 */

// ✅ FUNÇÃO AUXILIAR: Validar entrada de telefone
function validatePhoneInput(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '';
  }
  return phone.trim();
}

// ✅ FUNÇÃO AUXILIAR: Remover caracteres especiais
function removeSpecialChars(phone: string): string {
  // Remover espaços, traços, parênteses e outros caracteres não numéricos
  return phone.replace(/[\s\-()]/g, '');
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 9 → <8)
function cleanPhoneInput(phone: string): string {
  const validPhone = validatePhoneInput(phone);
  if (!validPhone) return '';
  
  return removeSpecialChars(validPhone);
}

// ✅ FUNÇÃO DE PROCESSAMENTO DE PREFIXO INTERNACIONAL
function processInternationalPrefix(phone: string): string {
  // Se já começa com +, considerar como formato completo
  if (phone.startsWith('+')) {
    // Remover todos os caracteres não numéricos, exceto o "+"
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Garantir que não haja múltiplos sinais de +
    if (cleanPhone.indexOf('+', 1) > 0) {
      cleanPhone = '+' + cleanPhone.substring(1).replace(/\+/g, '');
    }
    return cleanPhone;
  }
  
  // Se começa com 00, substituir por +
  if (phone.startsWith('00')) {
    return '+' + phone.substring(2);
  }
  
  return phone;
}

// ✅ FUNÇÃO DE DETECÇÃO DE NÚMERO PORTUGUÊS
function addPortugalPrefix(phone: string): string {
  // Para números portugueses sem prefixo
  // Verificar se começa com 9 e tem 9 dígitos (formato português típico)
  if (/^9\d{8}$/.test(phone)) {
    return '+351' + phone;
  }
  
  // Se for um número local com 9 dígitos no total (formato típico PT)
  if (phone.length === 9 && /^[1-9]\d{8}$/.test(phone)) {
    return '+351' + phone;
  }
  
  return phone;
}

/**
 * ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade reduzida de 9 para <8)
 * Normaliza um número de telefone removendo caracteres especiais
 * e lidando com prefixos internacionais
 */
export function normalizePhone(phone: string): string {
  // 1. Limpeza inicial
  const cleanedPhone = cleanPhoneInput(phone);
  if (!cleanedPhone) return '';
  
  // 2. Processar prefixos internacionais
  const processedPhone = processInternationalPrefix(cleanedPhone);
  
  // 3. Adicionar prefixo de Portugal se necessário
  const finalPhone = addPortugalPrefix(processedPhone);
  
  return finalPhone;
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