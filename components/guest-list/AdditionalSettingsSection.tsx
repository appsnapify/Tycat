'use client'

import { Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

interface AdditionalSettingsSectionProps {
  form: any
  flyerPreview: string | null
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function AdditionalSettingsSection({ 
  form, 
  flyerPreview, 
  handleFileChange 
}: AdditionalSettingsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium border-b pb-2">Configurações Adicionais</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start pt-2">
        <FormField
          control={form.control}
          name="maxGuests"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Limite de Convidados</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 500"
                  {...field}
                  onChange={event => field.onChange(event.target.value === '' ? undefined : +event.target.value)}
                />
              </FormControl>
              <FormDescription>
                Nº máximo de nomes na lista (padrão 1000).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="flyer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Flyer do Evento *</FormLabel>
              <FormControl>
                <Input
                  id="flyer-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  ref={field.ref}
                  name={field.name}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    field.onChange(e.target.files)
                    handleFileChange(e)
                  }}
                />
              </FormControl>
              <label
                htmlFor="flyer-input"
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2",
                  "cursor-pointer w-full"
                )}
              >
                <Upload className="mr-2 h-4 w-4" />
                {flyerPreview ? 'Alterar Flyer' : 'Escolher Flyer'}
              </label>
              {flyerPreview && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Pré-visualização:</p>
                  <img 
                    src={flyerPreview} 
                    alt="Pré-visualização do Flyer" 
                    className="max-w-xs max-h-48 object-cover rounded-md border" 
                  />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isEventActive"
          render={({ field }) => (
            <FormItem className="flex flex-col items-start space-y-3 rounded-md border p-4 h-full justify-center">
              <div className="flex flex-row items-center justify-between w-full">
                <FormLabel className="text-base mb-0">Estado do Evento</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Estado do evento"
                  />
                </FormControl>
              </div>
              <FormDescription>
                {field.value
                 ? "Ativo: Evento visível e funcional."
                 : "Inativo: Evento oculto (rascunho)."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
