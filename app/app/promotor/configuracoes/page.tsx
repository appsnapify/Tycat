'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { toast } from 'sonner'
import { Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

import { createClient } from '@/lib/supabase/client'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Schema de validação
const profileFormSchema = z.object({
  first_name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  last_name: z.string().min(2, 'Sobrenome deve ter no mínimo 2 caracteres'),
  avatar_url: z.string().optional(),
  phone: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [currentProfile, setCurrentProfile] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()
  
  // Inicializar formulário
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      avatar_url: '',
      phone: '',
    },
  })

  // Carregar dados do perfil
  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        console.log('Iniciando carregamento do perfil...')
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Erro na sessão:', sessionError)
          return
        }

        if (!session) {
          console.log('Sessão não encontrada')
          return
        }

        const user = session.user
        console.log('Usuário encontrado:', user.id.substring(0, 8) + '...')

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        console.log('Resposta do perfil:', { profile, profileError })

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError)
          return
        }

        if (!profile) {
          console.log('Perfil não encontrado')
          return
        }

        setCurrentProfile(profile)
        console.log('Perfil carregado:', profile)

        if (mounted) {
          form.reset({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            avatar_url: profile.avatar_url || '',
            phone: profile.phone || '',
          })
          console.log('Formulário atualizado com dados do perfil')
        }
      } catch (error) {
        console.error('Erro geral:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [form, supabase])

  // Upload de avatar
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      const file = event.target.files?.[0]
      if (!file) {
        toast.error('Nenhum arquivo selecionado')
        return
      }

      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem')
        return
      }

      // Validar tamanho (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB')
        return
      }

      // Obter sessão atual
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError)
        toast.error('Erro ao verificar sessão')
        return
      }

      const session = sessionData?.session
      if (!session?.user) {
        console.error('Sessão não encontrada')
        toast.error('Sessão expirada, faça login novamente')
        router.push('/login')
        return
      }

      const { user } = session

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `avatars/${user.id}/${fileName}`

      // Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Erro no upload:', uploadError)
        toast.error('Erro ao fazer upload do avatar')
        return
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      if (!urlData?.publicUrl) {
        toast.error('Erro ao obter URL do avatar')
        return
      }

      const publicUrl = urlData.publicUrl

      // Atualizar form
      form.setValue('avatar_url', publicUrl)

      // Atualizar perfil mantendo os campos obrigatórios
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          id: user.id,
          first_name: currentProfile.first_name,
          last_name: currentProfile.last_name,
          role: currentProfile.role,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError)
        toast.error('Erro ao atualizar perfil com novo avatar')
        return
      }

      toast.success('Avatar atualizado com sucesso!')
      router.refresh()
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao fazer upload do avatar')
    } finally {
      setUploading(false)
    }
  }

  // Salvar alterações
  async function onSubmit(data: ProfileFormValues) {
    try {
      setLoading(true)
      console.log('Iniciando salvamento...')

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError)
        toast.error('Erro ao verificar sessão')
        return
      }

      if (!session?.user) {
        console.log('Sem sessão ao tentar salvar')
        toast.error('Sessão expirada, faça login novamente')
        router.push('/login')
        return
      }

      const userId = session.user.id
      console.log('Salvando para usuário:', userId)

      // Atualizar perfil mantendo os campos obrigatórios
      const { error: saveError } = await supabase
        .from('profiles')
        .update({
          id: userId,
          first_name: data.first_name,
          last_name: data.last_name,
          role: currentProfile.role,
          avatar_url: data.avatar_url,
          phone: data.phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (saveError) {
        console.error('Erro ao salvar:', saveError)
        toast.error('Erro ao atualizar perfil: ' + saveError.message)
        return
      }

      console.log('Salvo com sucesso')
      toast.success('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar:', error)
      toast.error('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-150px)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Carregando dados do perfil...</span>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="text-2xl font-bold mb-8">Configurações do Perfil</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Preview e Upload */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={form.watch('avatar_url')} />
              <AvatarFallback>
                {form.watch('first_name')?.[0]?.toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                disabled={uploading}
                className="hidden"
                id="avatar-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading}
                onClick={() => document.getElementById('avatar-upload')?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Avatar
              </Button>
            </div>
          </div>

          {/* Nome */}
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Sobrenome */}
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sobrenome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu sobrenome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Telefone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefone</FormLabel>
                <FormControl>
                  <Input placeholder="Seu telefone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full bg-lime-500 hover:bg-lime-600 text-white"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </form>
      </Form>
    </div>
  )
} 