'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { format } from 'date-fns'
import { Calendar as CalendarIcon, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@supabase/supabase-js'
import { useOrganization } from '@/app/contexts/organization-context'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabase'

// Schema do formulário
const GuestListFormSchema = z.object({
  title: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'A descrição deve ter pelo menos 10 caracteres'),
  startDate: z.date({
    required_error: 'A data de início do evento é obrigatória',
  }),
  endDate: z.date({
    required_error: 'A data de término do evento é obrigatória',
  }),
  guestListOpenDate: z.date({
    required_error: 'A data de abertura da lista é obrigatória',
  }),
  guestListCloseDate: z.date({
    required_error: 'A data de fechamento da lista é obrigatória',
  }),
  location: z.string().min(3, 'O local deve ter pelo menos 3 caracteres'),
  flyer: z.instanceof(FileList).optional(),
}).refine(data => data.guestListOpenDate < data.guestListCloseDate, {
  message: "A data de abertura da lista deve ser anterior à data de fechamento",
  path: ["guestListCloseDate"], // Mostra o erro no campo de data de fechamento
}).refine(data => data.startDate <= data.endDate, {
  message: "A data de início do evento deve ser anterior ou igual à data de término",
  path: ["endDate"],
}).refine(data => data.guestListCloseDate <= data.startDate, {
  message: "A lista deve fechar antes ou no momento em que o evento começa",
  path: ["guestListCloseDate"],
});

type GuestListFormValues = z.infer<typeof GuestListFormSchema>

export default function GuestListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = searchParams.get('id')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isEditMode, setIsEditMode] = useState(!!eventId)
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)
  const { currentOrganization } = useOrganization()

  const form = useForm<GuestListFormValues>({
    resolver: zodResolver(GuestListFormSchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
    },
  })

  // Carregar dados do evento quando estiver em modo de edição
  useEffect(() => {
    async function loadEventData() {
      if (eventId && currentOrganization) {
        try {
          setIsSubmitting(true)
          console.log("Carregando evento para edição:", eventId)
          
          // Buscar evento do Supabase
          const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', eventId)
            .eq('organization_id', currentOrganization.id)
            .single()
          
          if (error) {
            console.error("Erro ao carregar evento:", error)
            toast({
              title: "Erro",
              description: "Não foi possível carregar os dados do evento",
              variant: "destructive"
            })
            return
          }
          
          console.log("Evento carregado:", event)
          
          // Verificar se é um evento de guest list
          if (event.type !== 'guest-list') {
            console.error("Evento não é do tipo guest list")
            toast({
              title: "Tipo incorreto",
              description: "Este evento não é uma guest list",
              variant: "destructive"
            })
            return
          }
          
          // Preencher o formulário com os dados do evento
          form.setValue('title', event.title || '')
          form.setValue('description', event.description || '')
          
          // Converter data de início
          if (event.date) {
            const startDate = new Date(event.date)
            if (event.time) {
              const [hours, minutes, seconds] = event.time.split(':')
              startDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || '0'))
            }
            form.setValue('startDate', startDate)
          }
          
          // Converter data de término se existir
          if (event.end_date) {
            const endDate = new Date(event.end_date)
            if (event.end_time) {
              const [hours, minutes, seconds] = event.end_time.split(':')
              endDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || '0'))
            }
            form.setValue('endDate', endDate)
          } else if (event.date) {
            // Se não tiver data de término, usar a mesma data de início
            const endDate = new Date(event.date)
            // Adicionar 3 horas à data de início
            endDate.setHours(endDate.getHours() + 3)
            form.setValue('endDate', endDate)
          }
          
          // Converter data de abertura da lista
          if (event.guest_list_open_datetime) {
            form.setValue('guestListOpenDate', new Date(event.guest_list_open_datetime));
          }

          // Converter data de fechamento da lista
          if (event.guest_list_close_datetime) {
            form.setValue('guestListCloseDate', new Date(event.guest_list_close_datetime));
          }
          
          form.setValue('location', event.location || '')
          
          // Mostrar preview do flyer
          if (event.flyer_url) {
            setFlyerPreview(event.flyer_url)
          }
        } catch (error) {
          console.error("Erro ao carregar evento:", error)
          toast({
            title: "Erro",
            description: "Ocorreu um problema ao carregar os dados do evento",
            variant: "destructive"
          })
        } finally {
          setIsSubmitting(false)
        }
      }
    }
    
    loadEventData()
  }, [eventId, currentOrganization, form])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFlyerPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      
      // Atualizamos o campo flyer no formulário
      form.setValue('flyer', e.target.files as FileList)
    }
  }

  const onSubmitGuestList = async (data: GuestListFormValues) => {
    if (!currentOrganization) {
      toast({
        title: "Nenhuma organização selecionada",
        description: "Você precisa selecionar uma organização para criar um evento",
        variant: "destructive"
      })
      return
    }

    // Verificar sessão de autenticação
    const { data: authData, error: authError } = await supabase.auth.getSession()
    console.log("Informações da sessão:", authData?.session ? "Usuário autenticado" : "Usuário não autenticado")
    console.log("Detalhes da sessão:", authData)
    
    if (authError || !authData.session) {
      console.error("Erro de autenticação:", authError)
      toast({
        title: "Erro de autenticação",
        description: "Você não está autenticado. Faça login novamente.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)
      console.log("Dados do formulário:", data)
      
      let flyerUrl = null
      
      // Só enviar o flyer se for um novo evento ou se for fornecido um novo arquivo
      if (!isEditMode || (data.flyer && data.flyer.length > 0)) {
        // Se estiver editando e não tiver novo flyer, manter o atual
        if (isEditMode && (!data.flyer || data.flyer.length === 0)) {
          flyerUrl = flyerPreview;
        } else {
          // fazer o upload do flyer
          const file = data.flyer![0]
          const fileExt = file.name.split('.').pop()
          const fileName = `${uuidv4()}.${fileExt}`
          
          console.log("Iniciando upload do flyer:", fileName)
          
          // Verificar buckets disponíveis
          const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets()
          
          if (bucketError) {
            console.error("Erro ao listar buckets:", bucketError)
            // Apenas logar o erro, mas continuar com uma URL alternativa
            console.log("Continuando sem upload de imagem")
            // Usar dataURL como fallback (não ideal para produção, mas funciona para testes)
            const reader = new FileReader()
            const imageDataPromise = new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result)
              reader.readAsDataURL(file)
            })
            
            flyerUrl = await imageDataPromise as string
            console.log("Usando image data URL como fallback")
          } else {
            console.log("Buckets disponíveis:", bucketList)
            
            // Ver se temos algum bucket disponível
            if (bucketList && bucketList.length > 0) {
              // Usar o primeiro bucket disponível
              const bucketName = bucketList[0].name
              console.log(`Usando bucket disponível: ${bucketName}`)
              
              // Fazer o upload
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(fileName, file, {
                  cacheControl: '3600',
                  upsert: true
                })
                
              if (uploadError) {
                console.error("Erro no upload:", uploadError)
                // Continuar mesmo com erro de upload
                const reader = new FileReader()
                const imageDataPromise = new Promise((resolve) => {
                  reader.onloadend = () => resolve(reader.result)
                  reader.readAsDataURL(file)
                })
                
                flyerUrl = await imageDataPromise as string
                console.log("Usando image data URL como fallback após erro de upload")
              } else {
                console.log("Upload concluído com sucesso:", uploadData)
                
                // Obter URL pública
                const { data: publicUrlData } = supabase.storage
                  .from(bucketName)
                  .getPublicUrl(fileName)
                  
                flyerUrl = publicUrlData.publicUrl
                console.log("URL do flyer:", flyerUrl)
              }
            } else {
              console.log("Nenhum bucket disponível. Usando alternativa.")
              // Usar dataURL como fallback
              const reader = new FileReader()
              const imageDataPromise = new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result)
                reader.readAsDataURL(file)
              })
              
              flyerUrl = await imageDataPromise as string
              console.log("Usando image data URL como fallback (sem buckets)")
            }
          }
        }
      } else if (isEditMode) {
        // Manter o flyer atual se estivermos editando
        flyerUrl = flyerPreview;
      }

      // Construir objeto do evento
      const eventData = {
        title: data.title,
        description: data.description,
        date: new Date(data.startDate).toISOString().split('T')[0],
        time: new Date(data.startDate).toISOString().split('T')[1].substring(0, 8),
        end_date: new Date(data.endDate).toISOString().split('T')[0],
        end_time: new Date(data.endDate).toISOString().split('T')[1].substring(0, 8),
        location: data.location,
        flyer_url: flyerUrl,
        organization_id: currentOrganization.id,
        type: 'guest-list',
        is_active: true,
        guest_list_open_datetime: data.guestListOpenDate.toISOString(),
        guest_list_close_datetime: data.guestListCloseDate.toISOString(),
        guest_list_settings: {
          max_guests: 100, // Valor padrão
          requires_approval: false // Valor padrão
        }
      }
      
      console.log("Dados do evento para " + (isEditMode ? "atualização" : "inserção") + ":", eventData)
      
      let result;
      
      if (isEditMode && eventId) {
        // Atualizar evento existente
        const { data: updatedEvent, error: updateError } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', eventId)
          .eq('organization_id', currentOrganization.id)
          .select()
          .single()
        
        if (updateError) {
          console.error("Erro ao atualizar evento:", updateError)
          throw new Error(`Erro ao atualizar evento: ${updateError.message}`)
        }
        
        result = updatedEvent
        
        toast({
          title: "Guest List atualizada com sucesso",
          description: "Sua guest list foi atualizada"
        })
      } else {
        // Inserir novo evento
        const { data: insertedEvent, error } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single()
        
        if (error) {
          console.error("Erro ao inserir evento:", error)
          throw new Error(`Erro ao criar evento: ${error.message}`)
        }
        
        result = insertedEvent
        
        toast({
          title: "Guest List criada com sucesso",
          description: "Sua guest list foi criada e já está disponível"
        })
      }
      
      console.log("Evento " + (isEditMode ? "atualizado" : "inserido") + " com sucesso:", result)
      
      // Redirecionar para a página de eventos
      router.push('/app/organizador/eventos')
    } catch (error) {
      console.error("Erro ao processar formulário:", error)
      toast({
        title: "Erro ao " + (isEditMode ? "atualizar" : "criar") + " guest list",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao " + (isEditMode ? "atualizar" : "criar") + " sua guest list",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'Editar Guest List' : 'Criar Guest List'}
        </h1>
        <p className="text-gray-500">
          {isEditMode ? 'Atualize os detalhes da sua guest list' : 'Configure os detalhes da sua guest list'}
        </p>
      </div>

      <Card className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitGuestList)} className="space-y-6">
            {/* Informações básicas do evento */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Informações do Evento</h2>
              
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Evento</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Festa VIP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva seu evento exclusivo..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Início <span className="text-xs text-muted-foreground">(Evento)</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy HH:mm')
                              ) : (
                                <span>Selecione data e hora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date()
                            }
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">Selecione a hora no campo abaixo (implementação pendente)</p>
                            <Input 
                              type="time" 
                              value={field.value ? format(field.value, 'HH:mm') : ''}
                              onChange={(e) => {
                                const time = e.target.value;
                                const [hours, minutes] = time.split(':');
                                const newDate = field.value ? new Date(field.value) : new Date();
                                newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Término <span className="text-xs text-muted-foreground">(Evento)</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'dd/MM/yyyy HH:mm')
                              ) : (
                                <span>Selecione data e hora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              form.getValues('startDate') && date < form.getValues('startDate')
                            }
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input 
                              type="time" 
                              value={field.value ? format(field.value, 'HH:mm') : ''}
                              onChange={(e) => {
                                const time = e.target.value;
                                const [hours, minutes] = time.split(':');
                                const newDate = field.value ? new Date(field.value) : new Date();
                                newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                                
                                // Validação extra: hora de fechamento no mesmo dia da abertura
                                const openDate = form.getValues('guestListOpenDate');
                                if(openDate && 
                                   newDate.toDateString() === openDate.toDateString() &&
                                   newDate.getTime() < openDate.getTime()) {
                                    // Resetar se for inválido? Ou mostrar erro? Por agora, apenas aplicamos.
                                    // Idealmente, a validação Zod pegaria isso, mas pode ser bom ter feedback imediato.
                                }
                                
                                field.onChange(newDate);
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Club Premium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Datas da Guest List */}
            <h2 className="text-lg font-semibold pt-4">Período de Registro na Lista</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guestListOpenDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Abertura da Lista</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy HH:mm')
                            ) : (
                              <span>Selecione data e hora</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">Selecione a hora no campo abaixo (implementação pendente)</p>
                          <Input 
                            type="time" 
                            value={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const newDate = field.value ? new Date(field.value) : new Date();
                              newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              field.onChange(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guestListCloseDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fechamento da Lista</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy HH:mm')
                            ) : (
                              <span>Selecione data e hora</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => 
                            (form.getValues('guestListOpenDate') && date < form.getValues('guestListOpenDate')) ||
                            (form.getValues('startDate') && date > form.getValues('startDate'))
                          }
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input 
                            type="time" 
                            value={field.value ? format(field.value, 'HH:mm') : ''}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const newDate = field.value ? new Date(field.value) : new Date();
                              newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
                              
                              // Validação extra: hora de fechamento no mesmo dia da abertura
                              const openDate = form.getValues('guestListOpenDate');
                              if(openDate && 
                                 newDate.toDateString() === openDate.toDateString() &&
                                 newDate.getTime() < openDate.getTime()) {
                                  // Resetar se for inválido? Ou mostrar erro? Por agora, apenas aplicamos.
                                  // Idealmente, a validação Zod pegaria isso, mas pode ser bom ter feedback imediato.
                              }
                              
                              field.onChange(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Upload do flyer */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Flyer do Evento</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => document.getElementById('flyer-upload')?.click()}>
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">Clique para fazer upload do flyer</p>
                    <p className="text-xs text-gray-400">PNG, JPG ou GIF até 5MB</p>
                    <input
                      id="flyer-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
                
                {flyerPreview && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200">
                    <img 
                      src={flyerPreview} 
                      alt="Flyer preview" 
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting 
                  ? 'Salvando...' 
                  : isEditMode 
                    ? 'Salvar Alterações' 
                    : 'Criar Guest List'
                }
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  )
} 