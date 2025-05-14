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