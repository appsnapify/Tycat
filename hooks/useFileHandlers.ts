'use client'

// Re-exports dos hooks divididos
import { useMainFileHandler } from './useFileHandlers/useMainFileHandler'
import { usePromotionalFiles } from './useFileHandlers/usePromotionalFiles'

export { useMainFileHandler, usePromotionalFiles }

// Hook combinado para compatibilidade
export function useFileHandlers(form: any) {
  const mainHandler = useMainFileHandler(form)
  const promotionalHandler = usePromotionalFiles(form)

  return {
    ...mainHandler,
    ...promotionalHandler
  }
}
