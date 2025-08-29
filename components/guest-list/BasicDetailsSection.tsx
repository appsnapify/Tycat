'use client'

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface BasicDetailsSectionProps {
  form: any
}

export function BasicDetailsSection({ form }: BasicDetailsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium border-b pb-2">Detalhes do Evento</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Evento *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Festa de Lançamento" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Localização *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Clube XPTO, Lisboa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição Detalhada *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o evento, tipo de música, dress code, etc."
                className="resize-y min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
