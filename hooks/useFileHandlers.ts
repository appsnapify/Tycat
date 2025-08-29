'use client'

// Re-exports dos hooks divididos
export { useMainFileHandler } from './useFileHandlers/useMainFileHandler'
export { usePromotionalFiles } from './useFileHandlers/usePromotionalFiles'

// Hook combinado para compatibilidade
export function useFileHandlers(form: any) {
  const mainHandler = useMainFileHandler(form)
  const promotionalHandler = usePromotionalFiles(form)

  return {
    ...mainHandler,
    ...promotionalHandler
  }
}
