import { useCallback } from 'react'

/**
 * Hook para fornecer feedback tátil usando a API de vibração
 * @returns Uma função que aceita um padrão de vibração (duração em ms ou array de durações)
 */
export const useVibrate = () => {
  return useCallback((pattern: number | number[]) => {
    try {
      if ('vibrate' in navigator) {
        if (Array.isArray(pattern)) {
          navigator.vibrate(pattern)
        } else {
          navigator.vibrate(pattern)
        }
      }
    } catch (error) {
      console.warn('Vibração não suportada:', error)
    }
  }, [])
} 