/**
 * 📱 DETECTOR DE PAÍS POR CÓDIGO DE TELEFONE
 * Seguindo regras @regrascodacy.md - Complexidade máxima: 2
 * 
 * Funcionalidades:
 * - Detecção automática do país baseada no código do telefone
 * - Suporte para os principais países europeus
 * - Fallback seguro para Portugal
 * - Performance otimizada com Map lookup
 */

// ✅ MAPA DE CÓDIGOS DE PAÍS (Complexidade: 1 - apenas dados estáticos)
const COUNTRY_CODE_MAP = new Map<string, string>([
  // Países principais
  ['+351', 'PT'], // Portugal
  ['+34', 'ES'],  // Espanha
  ['+33', 'FR'],  // França
  ['+49', 'DE'],  // Alemanha
  ['+39', 'IT'],  // Itália
  ['+44', 'GB'],  // Reino Unido
  ['+41', 'CH'],  // Suíça
  ['+43', 'AT'],  // Áustria
  ['+31', 'NL'],  // Holanda
  ['+32', 'BE'],  // Bélgica
  
  // Países adicionais
  ['+1', 'US'],     // Estados Unidos/Canadá
  ['+55', 'BR'],    // Brasil
  ['+54', 'AR'],    // Argentina
  ['+52', 'MX'],    // México
  ['+86', 'CN'],    // China
  ['+81', 'JP'],    // Japão
  ['+91', 'IN'],    // Índia
  ['+61', 'AU'],    // Austrália
  ['+7', 'RU'],     // Rússia
  ['+90', 'TR'],    // Turquia
]);

// ✅ NOMES DOS PAÍSES EM PORTUGUÊS
const COUNTRY_NAMES = new Map<string, string>([
  ['PT', 'Portugal'],
  ['ES', 'Espanha'],
  ['FR', 'França'],
  ['DE', 'Alemanha'],
  ['IT', 'Itália'],
  ['GB', 'Reino Unido'],
  ['CH', 'Suíça'],
  ['AT', 'Áustria'],
  ['NL', 'Holanda'],
  ['BE', 'Bélgica'],
  ['US', 'Estados Unidos'],
  ['BR', 'Brasil'],
  ['AR', 'Argentina'],
  ['MX', 'México'],
  ['CN', 'China'],
  ['JP', 'Japão'],
  ['IN', 'Índia'],
  ['AU', 'Austrália'],
  ['RU', 'Rússia'],
  ['TR', 'Turquia'],
]);

// ✅ INTERFACE para informações do país
export interface CountryInfo {
  code: string;
  name: string;
  phonePrefix: string;
  isPortugal: boolean;
}

// ✅ FUNÇÃO PRINCIPAL: Detectar país por telefone (Complexidade: 2)
export const detectCountryFromPhone = (phoneNumber: string): string => {
  // Early return para inputs inválidos
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return 'PT'; // Default para Portugal
  }
  
  const cleanPhone = phoneNumber.trim();
  
  // Buscar código de país no mapa
  for (const [prefix, countryCode] of COUNTRY_CODE_MAP) {
    if (cleanPhone.startsWith(prefix)) {
      return countryCode;
    }
  }
  
  // Fallback para Portugal
  return 'PT';
};

// ✅ FUNÇÃO UTILITÁRIA: Obter informações completas do país (Complexidade: 1)
export const getCountryInfo = (phoneNumber: string): CountryInfo => {
  const countryCode = detectCountryFromPhone(phoneNumber);
  const phonePrefix = getPhonePrefixFromCode(countryCode);
  
  return {
    code: countryCode,
    name: COUNTRY_NAMES.get(countryCode) || 'Desconhecido',
    phonePrefix,
    isPortugal: countryCode === 'PT'
  };
};

// ✅ FUNÇÃO UTILITÁRIA: Obter prefixo por código de país (Complexidade: 1)
const getPhonePrefixFromCode = (countryCode: string): string => {
  for (const [prefix, code] of COUNTRY_CODE_MAP) {
    if (code === countryCode) return prefix;
  }
  return '+351'; // Default para Portugal
};

// ✅ FUNÇÃO UTILITÁRIA: Validar se é telefone português (Complexidade: 1)
export const isPortuguesePhone = (phoneNumber: string): boolean => {
  return detectCountryFromPhone(phoneNumber) === 'PT';
};

// ✅ FUNÇÃO UTILITÁRIA: Normalizar telefone português (Complexidade: 2)
export const normalizePortuguesePhone = (phoneNumber: string): string => {
  if (!phoneNumber) return '';
  
  let cleanPhone = phoneNumber.replace(/\s|-|\(|\)/g, '');
  
  // Se já tem +351, retornar como está
  if (cleanPhone.startsWith('+351')) return cleanPhone;
  
  // Se começa com 351, adicionar +
  if (cleanPhone.startsWith('351')) return '+' + cleanPhone;
  
  // Se começa com 9 (telemóvel português), adicionar +351
  if (/^9[1236]\d{7}$/.test(cleanPhone)) return '+351' + cleanPhone;
  
  // Se começa com 0, remover e adicionar +351
  if (cleanPhone.startsWith('09')) return '+351' + cleanPhone.substring(1);
  
  return cleanPhone;
};

// ✅ FUNÇÃO UTILITÁRIA: Lista de países suportados (Complexidade: 1)
export const getSupportedCountries = (): CountryInfo[] => {
  return Array.from(COUNTRY_CODE_MAP.values())
    .map(code => ({
      code,
      name: COUNTRY_NAMES.get(code) || code,
      phonePrefix: getPhonePrefixFromCode(code),
      isPortugal: code === 'PT'
    }))
    .sort((a, b) => {
      // Portugal primeiro, depois alfabético
      if (a.isPortugal) return -1;
      if (b.isPortugal) return 1;
      return a.name.localeCompare(b.name);
    });
};

// ✅ FUNÇÃO DE DEBUG: Analisar telefone (Complexidade: 1)
export const analyzePhone = (phoneNumber: string) => {
  const countryInfo = getCountryInfo(phoneNumber);
  
  return {
    originalPhone: phoneNumber,
    detectedCountry: countryInfo,
    isValid: phoneNumber.length >= 8,
    isPortuguese: countryInfo.isPortugal,
    normalizedPhone: countryInfo.isPortugal 
      ? normalizePortuguesePhone(phoneNumber) 
      : phoneNumber
  };
};

// ✅ CONSTANTES para configuração
export const PHONE_CONFIG = {
  DEFAULT_COUNTRY: 'PT',
  MIN_PHONE_LENGTH: 8,
  MAX_PHONE_LENGTH: 15,
  PORTUGUESE_MOBILE_PREFIXES: ['91', '92', '93', '96']
} as const;
