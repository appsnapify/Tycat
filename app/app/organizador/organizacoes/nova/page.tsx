"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Upload, Link as LinkIcon, Check } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useSidebar } from '@/contexts/sidebar-context'
import { OrganizationPreview } from '@/components/organization-preview'
import { generateSlug } from '@/lib/utils'
import { createClient } from '@/lib/supabase'

interface FormData {
  name: string
  email: string
  address: string
  contacts: string
  instagram: string
  facebook: string
  youtube: string
  tiktok: string
  logo: File | null
  banner: File | null
}

export default function NewOrganizationPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { hideSidebar, showSidebar } = useSidebar()
  const [isLoading, setIsLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    address: '',
    contacts: '',
    instagram: '',
    facebook: '',
    youtube: '',
    tiktok: '',
    logo: null,
    banner: null
  })

  useEffect(() => {
    hideSidebar()
    return () => showSidebar()
  }, [hideSidebar, showSidebar])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione um ficheiro de imagem para o logo.");
        e.target.value = ''; // Limpa a seleção
        setFormData({ ...formData, logo: null });
        setLogoPreview(null);
        return;
      }
      setFormData({ ...formData, logo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, logo: null });
      setLogoPreview(null);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor, selecione um ficheiro de imagem para o banner.");
        e.target.value = ''; // Limpa a seleção
        setFormData({ ...formData, banner: null });
        setBannerPreview(null);
        return;
      }
      setFormData({ ...formData, banner: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFormData({ ...formData, banner: null });
      setBannerPreview(null);
    }
  };

  // ✅ PIPELINE DE VALIDAÇÃO (Complexidade: 2 pontos)
  const validateFormData = (data: typeof formData) => {
    const validations = [
      { check: () => data.name.trim(), message: "Por favor, preencha o Nome da Organização." },
      { check: () => data.email.trim() && /\S+@\S+\.\S+/.test(data.email), message: "Por favor, insira um E-mail válido." },
      { check: () => data.address.trim(), message: "Por favor, preencha a Morada." },
      { check: () => data.contacts.trim(), message: "Por favor, preencha o Telemóvel." },
      { check: () => data.logo, message: "Por favor, selecione um Logo para a organização." },
      { check: () => data.banner, message: "Por favor, selecione um Banner para a organização." }
    ];

    for (const validation of validations) {
      if (!validation.check()) {
        toast.error(validation.message);
        return false;
      }
    }
    return true;
  };

  // ✅ PREPARAR DADOS DE UPLOAD (Complexidade: 1 ponto)
  const prepareUploadData = (data: typeof formData, userId: string) => {
    const uploadData = new FormData();
    uploadData.append('name', data.name);
    uploadData.append('email', data.email);
    uploadData.append('address', data.address);
    uploadData.append('contacts', data.contacts);
    uploadData.append('instagram', data.instagram || '');
    uploadData.append('facebook', data.facebook || '');
    uploadData.append('youtube', data.youtube || '');
    uploadData.append('tiktok', data.tiktok || '');
    uploadData.append('logo', data.logo);
    uploadData.append('banner', data.banner);
    uploadData.append('userId', userId);
    return uploadData;
  };

  // ✅ ENVIAR DADOS PARA API (Complexidade: 3 pontos)
  const submitToAPI = async (uploadData: FormData) => {
    const response = await fetch('/api/organizations', {
      method: 'POST',
      body: uploadData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao criar organização');
    }

    return await response.json();
  };

  // ✅ FUNÇÃO PRINCIPAL SIMPLIFICADA (Complexidade: 5 pontos)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFormData(formData)) return; // +1

    setIsLoading(true);
    let submissionError: Error | null = null;

    try {
      if (!user) throw new Error('Usuário não autenticado'); // +1
      
      console.log('Enviando dados do formulário:', formData);
      
      const uploadData = prepareUploadData(formData, user.id);
      const data = await submitToAPI(uploadData);
      
      console.log('Organização criada com sucesso:', data);
      
      requestAnimationFrame(() => {
        toast.success('Organização criada com sucesso!');
        setTimeout(() => {
          router.push('/app/organizador/dashboard'); 
        }, 500);
      });

    } catch (err) { // +1
      submissionError = err instanceof Error ? err : new Error(String(err));
      console.error('Erro ao criar organização:', submissionError);
      
      requestAnimationFrame(() => {
        toast.error(`Erro ao criar organização: ${submissionError?.message || 'Erro desconhecido'}`);
      });
    } finally {
      if (submissionError) { // +1
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full">
      {/* Formulário */}
      <div className="w-full lg:w-1/2 p-4 lg:p-8 overflow-y-auto">
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
                placeholder="https://instagram.com/suaorganizacao"
              />
            </div>
            <div>
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                placeholder="https://facebook.com/suaorganizacao"
              />
            </div>
            <div>
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                value={formData.youtube}
                onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                placeholder="https://youtube.com/c/seu-canal"
              />
            </div>
            <div>
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                value={formData.tiktok}
                onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@seu-usuario"
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
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('logo')?.click()}
                  className="w-full"
                >
                  {formData.logo ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Logo Carregado ({formData.logo.name})
                    </>
                  ) : (
                    <>
                  <Upload className="mr-2 h-4 w-4" />
                      Selecionar Logo
                    </>
                  )}
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
                  onChange={handleBannerChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('banner')?.click()}
                  className="w-full"
                >
                  {formData.banner ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-green-600" />
                      Banner Carregado ({formData.banner.name})
                    </>
                  ) : (
                    <>
                  <Upload className="mr-2 h-4 w-4" />
                      Selecionar Banner
                    </>
                  )}
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
      <div className="w-full lg:w-1/2 bg-gray-50 p-4 lg:p-8 border-l border-gray-200 mt-8 lg:mt-0 lg:sticky top-0 h-screen overflow-y-auto">
        <div className="lg:sticky top-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
          <OrganizationPreview
            name={formData.name}
            address={formData.address}
            logo={formData.logo}
            banner={formData.banner}
            instagram={formData.instagram}
            facebook={formData.facebook}
            youtube={formData.youtube}
            tiktok={formData.tiktok}
          />
          
          {/* Link da Organização */}
          {/* {organizationUrl && (
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
          )} */}
        </div>
      </div>
    </div>
  )
} 