'use client'

import { Upload, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface PromotionalMaterialsSectionProps {
  form: any
  isEditMode: boolean
  existingPromoImageUrls: string[]
  promotionalFiles: File[]
  promotionalPreviews: string[]
  handlePromotionalFilesChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  removePromotionalImage: (index: number) => void
  MAX_PROMO_IMAGES: number
  MAX_FILE_SIZE_MB: number
}

export function PromotionalMaterialsSection({
  form,
  isEditMode,
  existingPromoImageUrls,
  promotionalFiles,
  promotionalPreviews,
  handlePromotionalFilesChange,
  removePromotionalImage,
  MAX_PROMO_IMAGES,
  MAX_FILE_SIZE_MB
}: PromotionalMaterialsSectionProps) {
  return (
    <div className="space-y-4 p-4 border rounded-md">
      <h3 className="text-lg font-medium border-b pb-2">Material Publicitário (p/ Promotores)</h3>
      <FormField
        control={form.control}
        name="promotionalImages"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Carregar Imagens (Max: {MAX_PROMO_IMAGES})</FormLabel>
            <label
              htmlFor="promotional-images-input"
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
                "cursor-pointer",
                promotionalFiles.length >= MAX_PROMO_IMAGES && "opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="mr-2 h-4 w-4" />
              Escolher Ficheiros
            </label>
            <FormControl>
              <Input
                id="promotional-images-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePromotionalFilesChange}
                className="sr-only"
                disabled={promotionalFiles.length >= MAX_PROMO_IMAGES}
                ref={field.ref}
              />
            </FormControl>
            {promotionalFiles.length > 0 && (
              <div className="text-sm text-muted-foreground mt-2">
                {promotionalFiles.length} {promotionalFiles.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}.
              </div>
            )}
            <FormDescription>
              Carregue até {MAX_PROMO_IMAGES} imagens (max {MAX_FILE_SIZE_MB}MB cada) para os promotores usarem.
              {isEditMode && existingPromoImageUrls.length > 0 && (
                ` ${existingPromoImageUrls.length} imagens existentes serão mantidas a menos que substituídas.`
              )}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Pré-visualização das imagens */}
      {(promotionalPreviews.length > 0 || existingPromoImageUrls.length > 0) && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Imagens Carregadas:</p>
          <div className="flex flex-wrap gap-4">
            {/* Imagens existentes */}
            {isEditMode && existingPromoImageUrls.map((url, index) => (
              <div key={`existing-${index}`} className="relative group w-24 h-24 border rounded-md overflow-hidden bg-muted">
                <img
                  src={url}
                  alt={`Material existente ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = '/placeholder-image.png' }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 px-1 py-0.5">
                  <span className="text-white text-xs font-semibold truncate">Existente</span>
                </div>
              </div>
            ))}
            {/* Novas imagens */}
            {promotionalPreviews.map((previewUrl, index) => (
              <div key={`new-${index}`} className="relative group w-24 h-24 border rounded-md overflow-hidden">
                <img src={previewUrl} alt={`Nova imagem ${index + 1}`} className="w-full h-full object-cover" />
                <Button 
                  variant="destructive"
                  size="icon"
                  type="button"
                  className="absolute top-1 right-1 h-6 w-6 p-0 opacity-70 group-hover:opacity-100 transition-opacity z-10"
                  onClick={() => removePromotionalImage(index)}
                  title="Remover imagem"
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
