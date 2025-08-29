'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

const MAX_PROMO_IMAGES = 3
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// Hook para manipulação de arquivos
export function useFileHandlers(form: any) {
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)
  const [promotionalFiles, setPromotionalFiles] = useState<File[]>([])
  const [promotionalPreviews, setPromotionalPreviews] = useState<string[]>([])

  // Handler para flyer
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const dataTransfer = new DataTransfer()
    const emptyFileList = dataTransfer.files

    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ 
          title: "Erro", 
          description: "Por favor, selecione um ficheiro de imagem.", 
          variant: "destructive" 
        })
        e.target.value = ''
        setFlyerPreview(null)
        form.setValue('flyer', emptyFileList, { shouldValidate: true })
        return
      }
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast({ 
          title: "Erro", 
          description: `O ficheiro é demasiado grande (máximo ${MAX_FILE_SIZE_MB}MB).`, 
          variant: "destructive" 
        })
        e.target.value = ''
        setFlyerPreview(null)
        form.setValue('flyer', emptyFileList, { shouldValidate: true })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => { setFlyerPreview(reader.result as string) }
      reader.readAsDataURL(file)
      form.setValue('flyer', e.target.files as FileList, { shouldValidate: true, shouldDirty: true })
    } else {
      setFlyerPreview(null)
      form.setValue('flyer', emptyFileList, { shouldValidate: true })
    }
  }

  // Handler para imagens promocionais
  const handlePromotionalFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files
    if (!selectedFiles) {
      setPromotionalFiles([])
      setPromotionalPreviews([])
      form.setValue('promotionalImages', undefined)
      return
    }

    const newFilesArray = Array.from(selectedFiles)
    const combinedFiles = [...promotionalFiles, ...newFilesArray].slice(0, MAX_PROMO_IMAGES)

    const validFiles: File[] = []
    const fileProcessingPromises: Promise<string>[] = []

    combinedFiles.forEach((file, index) => {
      if (!file.type.startsWith('image/')) {
        if (index >= promotionalFiles.length) {
          toast({ 
            title: "Tipo Inválido", 
            description: `'${file.name}' não é uma imagem.`, 
            variant: "destructive" 
          })
        }
        return
      }
      
      if (file.size > MAX_FILE_SIZE_BYTES) {
        if (index >= promotionalFiles.length) {
          toast({ 
            title: "Tamanho Excedido", 
            description: `'${file.name}' excede ${MAX_FILE_SIZE_MB}MB.`, 
            variant: "destructive" 
          })
        }
        return
      }

      validFiles.push(file)

      const readerPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      fileProcessingPromises.push(readerPromise)
    })

    setPromotionalFiles(validFiles)

    Promise.all(fileProcessingPromises).then(previews => {
      setPromotionalPreviews(previews)
    }).catch(error => {
      console.error("Erro ao gerar previews:", error)
      toast({ 
        title: "Erro de Preview", 
        description: "Não foi possível gerar a pré-visualização de uma imagem.", 
        variant: "destructive" 
      })
    })

    const dataTransfer = new DataTransfer()
    validFiles.forEach(file => dataTransfer.items.add(file))
    form.setValue('promotionalImages', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { 
      shouldValidate: true, 
      shouldDirty: true 
    })

    e.target.value = ''
  }

  // Remover imagem promocional
  const removePromotionalImage = (indexToRemove: number) => {
    const updatedFiles = promotionalFiles.filter((_, index) => index !== indexToRemove)
    const updatedPreviews = promotionalPreviews.filter((_, index) => index !== indexToRemove)

    setPromotionalFiles(updatedFiles)
    setPromotionalPreviews(updatedPreviews)

    const dataTransfer = new DataTransfer()
    updatedFiles.forEach(file => dataTransfer.items.add(file))
    form.setValue('promotionalImages', dataTransfer.files.length > 0 ? dataTransfer.files : undefined, { 
      shouldValidate: true, 
      shouldDirty: true 
    })
  }

  return {
    flyerPreview,
    setFlyerPreview,
    promotionalFiles,
    promotionalPreviews,
    handleFileChange,
    handlePromotionalFilesChange,
    removePromotionalImage,
    MAX_PROMO_IMAGES,
    MAX_FILE_SIZE_MB
  }
}
