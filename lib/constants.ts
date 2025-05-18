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