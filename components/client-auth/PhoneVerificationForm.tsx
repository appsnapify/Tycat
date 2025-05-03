'use client'

import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'

// Schema de validação para o telefone
const phoneFormSchema = z.object({
  phone: z
    .string()
    .min(9, { message: 'O telefone deve ter pelo menos 9 dígitos' })
    .regex(/^\+?[0-9\s\-()]+$/, { message: 'Formato de telefone inválido' }),
})

type PhoneFormValues = z.infer<typeof phoneFormSchema>

interface PhoneVerificationFormProps {
  onSubmit: (phone: string) => Promise<void>
  defaultPhone?: string
}

export function PhoneVerificationForm({ onSubmit, defaultPhone = '' }: PhoneVerificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: defaultPhone,
    },
  })

  const handleSubmit = async (data: PhoneFormValues) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data.phone)
    } catch (error) {
      console.error('Erro ao verificar telefone:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Acesso à Guest List</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Digite seu número de telefone para continuar
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="+351 912 345 678"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
} 