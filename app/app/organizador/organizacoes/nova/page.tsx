"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { useSidebar } from '@/contexts/sidebar-context'
import { OrganizationPreview } from '@/components/organization-preview'
import { generateSlug } from '@/lib/utils'
import { uploadOrganizationImage } from '@/lib/storage'

interface FormData {
  name: string
  email: string
  address: string
  contacts: string
  instagram: string
  facebook: string
  logo: File | null
  banner: File | null
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { hideSidebar, showSidebar } = useSidebar()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    address: '',
    contacts: '',
    instagram: '',
    facebook: '',
    logo: null,
    banner: null
  })

  useEffect(() => {
    hideSidebar()
    return () => showSidebar()
  }, [hideSidebar, showSidebar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (!user) {
        throw new Error('Usuário não autenticado')
      }

      if (!formData.logo || !formData.banner) {
        throw new Error('Logo e Banner são obrigatórios')
      }

      console.log('Enviando dados do formulário:', formData)

      // Upload de imagens (sem usar a função que dá erro)
      console.log('Iniciando upload do logo e banner diretamente...')
      
      // Criar um FormData para enviar arquivos
      const uploadData = new FormData()
      uploadData.append('name', formData.name)
      uploadData.append('email', formData.email)
      uploadData.append('address', formData.address)
      uploadData.append('contacts', formData.contacts)
      uploadData.append('instagram', formData.instagram || '')
      uploadData.append('facebook', formData.facebook || '')
      uploadData.append('logo', formData.logo)
      uploadData.append('banner', formData.banner)
      uploadData.append('userId', user.id)
      
      // Enviar para a API
      const response = await fetch('/api/organizations', {
        method: 'POST',
        body: uploadData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar organização')
      }

      const data = await response.json()
      console.log('Organização criada com sucesso:', data)
      
      // Usar requestAnimationFrame para garantir execução após renderização
      requestAnimationFrame(() => {
        toast.success('Organização criada com sucesso!');
        
        // Adicionar um pequeno delay antes de redirecionar
        setTimeout(() => {
           // Verificar para onde redirecionar (Dashboard parece mais lógico após criar)
           router.push('/app/organizador/dashboard'); 
        }, 500); // Pequeno delay para o toast ser visível
      });

    } catch (error) {
      console.error('Erro ao criar organização:', error)
      // Usar requestAnimationFrame para o toast de erro também
      requestAnimationFrame(() => {
        if (error instanceof Error) {
          toast.error(`Erro ao criar organização: ${error.message}`)
        } else {
          toast.error('Erro desconhecido ao criar organização')
        }
      });
    } finally {
      // Definir isLoading como false apenas se houve erro, 
      // senão o redirect cuida da mudança de UI.
      if (!(error instanceof Error)) { 
        // Não definir como false no sucesso para manter o botão desativado até o redirect
      } else {
        setIsLoading(false);
      }
    }
  }

  const organizationUrl = formData.name
    ? `${window.location.origin}/organizacao/${generateSlug(formData.name)}`
    : ''

  return (
    <div className="flex h-full">
      {/* Formulário */}
      <div className="w-1/2 p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nova Organização</h1>
          <p className="mt-2 text-gray-600">
            Preencha os dados da sua organização
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome da Organização</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome da organização"
            />
          </div>

          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@organizacao.com"
            />
          </div>

          <div>
            <Label htmlFor="address">Morada</Label>
            <Input
              id="address"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Morada da organização"
            />
          </div>

          <div>
            <Label htmlFor="contacts">Telemóvel</Label>
            <Input
              id="contacts"
              type="tel"
              required
              value={formData.contacts}
              onChange={(e) => setFormData({ ...formData, contacts: e.target.value })}
              placeholder="912345678"
            />
          </div>

          <div className="space-y-4">
            <Label>Redes Sociais</Label>
            <div>
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                placeholder="@seu.instagram"
              />
            </div>
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="Link do Facebook"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="logo">Logo da Organização</Label>
              <div className="mt-1 flex items-center">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFormData({ ...formData, logo: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {formData.logo ? formData.logo.name : 'Selecionar Logo'}
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="banner">Banner da Organização</Label>
              <div className="mt-1 flex items-center">
                <Input
                  id="banner"
                  type="file"
                  accept="image/*"
                  required
                  onChange={(e) => setFormData({ ...formData, banner: e.target.files?.[0] || null })}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('banner')?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {formData.banner ? formData.banner.name : 'Selecionar Banner'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Link href="/app/organizador/organizacoes">
              <Button type="button" variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Organização'}
            </Button>
          </div>
        </form>
      </div>

      {/* Preview */}
      <div className="w-1/2 p-8 bg-gray-50 overflow-y-auto">
        <div className="sticky top-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
          <OrganizationPreview
            formData={{
              name: formData.name,
              address: formData.address,
              instagram: formData.instagram,
              facebook: formData.facebook,
              logo: formData.logo || undefined,
              banner: formData.banner || undefined
            }} 
          />
          
          {/* Link da Organização */}
          {organizationUrl && (
            <div className="mt-6 p-4 bg-white rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Link da sua organização</h3>
              <div className="flex items-center space-x-2">
                <Input
                  readOnly
                  value={organizationUrl}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(organizationUrl)
                    toast.success('Link copiado!')
                  }}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 