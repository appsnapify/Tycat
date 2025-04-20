"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

interface Organization {
  id: string
  name: string
  email: string
  address: string
  location: string
  contacts: string
  social_media: string | null
  logotipo: string | null
  created_at: string
}

interface OrganizationClientProps {
  id: string
}

export default function OrganizationClient({ id }: OrganizationClientProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)

  useEffect(() => {
    async function loadOrganization() {
      if (!user) return

      try {
        // Verificar se o usuário tem acesso à organização
        const { data: userOrg, error: userOrgError } = await supabase
          .from('user_organizations')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', id)
          .single()

        if (userOrgError) throw userOrgError

        if (!userOrg) {
          toast.error('Você não tem acesso a esta organização')
          router.push('/app/organizador/organizacoes')
          return
        }

        // Carregar dados da organização
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', id)
          .single()

        if (orgError) throw orgError

        setOrganization(org)
      } catch (error) {
        console.error('Erro ao carregar organização:', error)
        toast.error('Erro ao carregar organização')
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [user, id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setIsSaving(true)

    // Gerar o novo slug a partir do nome atualizado no estado
    const newSlug = organization.name.toLowerCase().replace(/[^\w\s-]/g, '') // Remove caracteres não-palavra (exceto espaços e hifens)
                                 .replace(/\s+/g, '-') // Substitui espaços por hifens
                                 .replace(/-+/g, '-') // Remove hifens múltiplos
                                 .trim(); // Remove espaços no início/fim

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          email: organization.email,
          address: organization.address,
          location: organization.location,
          contacts: organization.contacts,
          social_media: organization.social_media,
          logotipo: organization.logotipo,
          slug: newSlug, // Adicionar o novo slug
          updated_at: new Date().toISOString() // Atualizar timestamp
        })
        .eq('id', organization.id)

      if (error) throw error

      toast.success('Organização atualizada com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar organização:', error)
      toast.error('Erro ao atualizar organização')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!organization || !confirm('Tem certeza que deseja excluir esta organização?')) {
      return
    }

    setIsDeleting(true)

    try {
      // Excluir todas as relações de usuários com a organização
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .delete()
        .eq('organization_id', organization.id)

      if (userOrgError) throw userOrgError

      // Excluir a organização
      const { error: orgError } = await supabase
        .from('organizations')
        .delete()
        .eq('id', organization.id)

      if (orgError) throw orgError

      toast.success('Organização excluída com sucesso!')
      router.push('/app/organizador/organizacoes')
    } catch (error) {
      console.error('Erro ao excluir organização:', error)
      toast.error('Erro ao excluir organização')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">A carregar organização...</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Organização não encontrada
          </h3>
          <Link href="/app/organizador/organizacoes">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Detalhes da Organização</h1>
        <p className="mt-2 text-gray-600">
          Edite os dados da sua organização
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="name">Nome da Organização</Label>
          <Input
            id="name"
            required
            value={organization.name}
            onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
            placeholder="Nome da organização"
          />
        </div>

        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={organization.email}
            onChange={(e) => setOrganization({ ...organization, email: e.target.value })}
            placeholder="email@organizacao.com"
          />
        </div>

        <div>
          <Label htmlFor="address">Morada</Label>
          <Input
            id="address"
            required
            value={organization.address}
            onChange={(e) => setOrganization({ ...organization, address: e.target.value })}
            placeholder="Morada da organização"
          />
        </div>

        <div>
          <Label htmlFor="location">Localização</Label>
          <Input
            id="location"
            required
            value={organization.location}
            onChange={(e) => setOrganization({ ...organization, location: e.target.value })}
            placeholder="Cidade, País"
          />
        </div>

        <div>
          <Label htmlFor="contacts">Contactos</Label>
          <Input
            id="contacts"
            required
            value={organization.contacts}
            onChange={(e) => setOrganization({ ...organization, contacts: e.target.value })}
            placeholder="Telefone, telemóvel, etc."
          />
        </div>

        <div>
          <Label htmlFor="social_media">Redes Sociais</Label>
          <Input
            id="social_media"
            value={organization.social_media || ''}
            onChange={(e) => setOrganization({ ...organization, social_media: e.target.value })}
            placeholder="Facebook, Instagram, etc."
          />
        </div>

        <div>
          <Label htmlFor="logotipo">Logotipo</Label>
          <Input
            id="logotipo"
            value={organization.logotipo || ''}
            onChange={(e) => setOrganization({ ...organization, logotipo: e.target.value })}
            placeholder="URL do logotipo"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/app/organizador/organizacoes">
              <Button type="button" variant="outline" className="flex items-center">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'A excluir...' : 'Excluir'}
            </Button>
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </div>
  )
} 