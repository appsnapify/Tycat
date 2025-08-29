'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'

const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

// Hook para flyer principal
export function useMainFileHandler(form: any) {
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)

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

  return {
    flyerPreview,
    setFlyerPreview,
    handleFileChange,
    MAX_FILE_SIZE_MB
  }
}
