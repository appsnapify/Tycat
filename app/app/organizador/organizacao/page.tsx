"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import { createClient } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Upload, Check, Save, Copy } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Image from 'next/image'
import { OrganizationPreview } from '@/components/organization-preview'

// Interface para os dados da organização (pode expandir conforme necessário)
interface OrganizationData {
  id: string
  name: string
  email: string
  address: string
  contacts: string
  logo_url?: string
  banner_url?: string
  social_media?: {
    instagram?: string
    facebook?: string
    youtube?: string
    tiktok?: string
    twitter?: string
    website?: string
  }
  // Adicionar outros campos se existirem
}

// Interface para o estado do formulário de edição
interface EditFormData {
  name: string
  email: string
  address: string
  contacts: string
  instagram: string
  facebook: string
  youtube: string
  tiktok: string
  // Para os ficheiros, vamos guardar o ficheiro selecionado ou null
  logoFile: File | null
  bannerFile: File | null
}

export default function OrganizacaoPage() {
  const { user } = useAuth() 
  // Correctly get currentOrganization and isLoading from the context
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization()
  
  const supabase = createClient()
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null)
  // Rename isFetching to isLoadingDetails to be clearer
  const [isLoadingDetails, setIsLoadingDetails] = useState(false) 
  const [error, setError] = useState<string | null>(null) 
  const [isSaving, setIsSaving] = useState(false) 
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  // State for copy button feedback
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.log(
      `[OrgPage Effect] Run. isOrgLoading=${isOrgLoading}, user? ${!!user}, currentOrg? ${!!currentOrganization?.id}`
    );

    // Step 1: Wait for context to finish loading and user to be present
    if (isOrgLoading || !user) {
      console.log("[OrgPage Effect] Context or User loading...");
      // Clear data if we are loading or logged out
      if (organizationData || editFormData || error) {
         setOrganizationData(null);
         setEditFormData(null);
         setError(null);
         setLogoPreview(null);
         setBannerPreview(null);
      }
      return; 
    }

    // Step 2: Context loaded and user present. Check if there is a current organization.
    if (currentOrganization) {
      const orgId = currentOrganization.id;

      // Step 3: Org identified. Fetch details if not already loaded/loading for THIS org.
      // We fetch full details here because the context might only have basic info.
      if (organizationData?.id !== orgId && !isLoadingDetails) {
        console.log(`[OrgPage Effect] Context has org ${orgId}. Fetching details...`);
        setError(null);
        setOrganizationData(null); // Clear previous data before fetch
        setEditFormData(null);
        setLogoPreview(null);
        setBannerPreview(null);
        setIsLoadingDetails(true);

        supabase
          .from('organizations')
          .select('*') // Select all details for the edit form
          .eq('id', orgId)
          .single()
          .then(({ data, error: fetchError }) => {
            if (fetchError) throw fetchError;
            if (!data) throw new Error("Organização não encontrada no DB via ID.");
            
            console.log("[OrgPage Effect] Fetch SUCCESS for", orgId, data);
            setOrganizationData(data); // Set the detailed data
            // Initialize form state with detailed data
            setEditFormData({
              name: data.name || '',
              email: data.email || '',
              address: data.address || '',
              contacts: data.contacts || '',
              instagram: data.social_media?.instagram || '',
              facebook: data.social_media?.facebook || '',
              youtube: data.social_media?.youtube || '',
              tiktok: data.social_media?.tiktok || '',
              logoFile: null,
              bannerFile: null,
            });
            // Set previews from detailed data
            setLogoPreview(data.logo_url || null);
            setBannerPreview(data.banner_url || null);
          })
          .catch((err: any) => {
            console.error("[OrgPage Effect] Fetch FAILED:", err);
            setError(err.message || "Erro ao carregar detalhes da organização.");
            setOrganizationData(null);
            setEditFormData(null);
          })
          .finally(() => {
            setIsLoadingDetails(false);
            console.log("[OrgPage Effect] Fetch details finished.");
          });
      } else if (organizationData?.id === orgId) {
          console.log(`[OrgPage Effect] Details for ${orgId} already loaded or fetch in progress.`);
      } else if (isLoadingDetails) {
           console.log(`[OrgPage Effect] Fetch details for ${orgId} already in progress.`);
      }
    } else {
      // Context loaded, user present, but NO current organization found by context
      console.log("[OrgPage Effect] Context loaded, user present, but no current org. Clearing data.");
      if (organizationData || editFormData || error) { // Clear if needed
        setOrganizationData(null);
        setEditFormData(null);
        setError("Nenhuma organização selecionada ou encontrada."); // Set specific error
        setLogoPreview(null);
        setBannerPreview(null);
      }
    }
  // Dependencies: React when context loading, user, or the current org object changes.
  }, [isOrgLoading, user, currentOrganization, supabase, organizationData, isLoadingDetails]); 

  // Handler para atualizar o estado do formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditFormData(prev => prev ? { ...prev, [name]: value } : null)
  }

  // Handler para mudança de ficheiro (logo)
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setEditFormData(prev => prev ? { ...prev, logoFile: file } : null)
    if (file) {
      setLogoPreview(URL.createObjectURL(file))
    } else {
      // Reverter para URL original se ficheiro for removido
      setLogoPreview(organizationData?.logo_url || null)
    }
  }

  // Handler para mudança de ficheiro (banner)
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setEditFormData(prev => prev ? { ...prev, bannerFile: file } : null)
    if (file) {
      setBannerPreview(URL.createObjectURL(file))
    } else {
      // Reverter para URL original se ficheiro for removido
      setBannerPreview(organizationData?.banner_url || null)
    }
  }

  // Função para guardar as alterações
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault()
    // Ensure we use organizationData?.id which comes from the fetched data
    if (!editFormData || !organizationData?.id) { 
      toast.error("Dados da organização inválidos ou não carregados.")
      return
    }
    
    const currentOrgId = organizationData.id; // Store ID before potential async ops
    setIsSaving(true)
    console.log('Iniciando salvamento...', editFormData)
    
    try {
      let logoUrl = organizationData.logo_url
      let bannerUrl = organizationData.banner_url

      if (editFormData.logoFile) {
        const logoFile = editFormData.logoFile
        const fileExt = logoFile.name.split('.').pop()
        const filePath = `public/${currentOrgId}/logo-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('organization_logos') 
          .upload(filePath, logoFile, { upsert: false })
        if (uploadError) throw new Error('Falha ao fazer upload do novo logo.')
        const { data: urlData } = supabase.storage.from('organization_logos').getPublicUrl(filePath)
        if (!urlData?.publicUrl) {
           logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/organization_logos/${filePath}`;
           console.warn(`URL pública construída manualmente: ${logoUrl}`);
        } else {
           logoUrl = urlData.publicUrl
        }
      }

      if (editFormData.bannerFile) {
        const bannerFile = editFormData.bannerFile
        const fileExt = bannerFile.name.split('.').pop()
        const filePath = `public/${currentOrgId}/banner-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('organization_banners') 
          .upload(filePath, bannerFile, { upsert: false })
        if (uploadError) throw new Error('Falha ao fazer upload do novo banner.')
        const { data: urlData } = supabase.storage.from('organization_banners').getPublicUrl(filePath)
         if (!urlData?.publicUrl) {
           bannerUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/organization_banners/${filePath}`;
           console.warn(`URL pública construída manualmente: ${bannerUrl}`);
        } else {
           bannerUrl = urlData.publicUrl
        }
      }

      const updatePayload = {
        name: editFormData.name,
        email: editFormData.email,
        address: editFormData.address,
        contacts: editFormData.contacts ? [editFormData.contacts] : null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        // Correctly merge social media: prioritize form data over existing data
        social_media: {
          ...(organizationData.social_media || {}), // Start with existing values
          instagram: editFormData.instagram || null,  // Overwrite with new value (or null)
          facebook: editFormData.facebook || null,   // Overwrite with new value (or null)
          youtube: editFormData.youtube || null,    // Overwrite with new value (or null)
          tiktok: editFormData.tiktok || null,      // Overwrite with new value (or null)
          // Keep twitter and website if they existed and weren't edited
          twitter: (organizationData.social_media?.twitter !== undefined) ? (organizationData.social_media.twitter) : (editFormData as any).twitter || null, // More robust check for twitter/website if they were added to form
          website: (organizationData.social_media?.website !== undefined) ? (organizationData.social_media.website) : (editFormData as any).website || null, // Adjust if twitter/website are added to form state
        },
        updated_at: new Date().toISOString(),
      };
      // Clean payload nulls/undefined if necessary

      const { data: updatedData, error: updateError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', currentOrgId) // Use stored ID
        .select()
        .single()

      if (updateError) throw new Error(updateError.message || 'Falha ao guardar alterações.')

      setOrganizationData(updatedData)
      setEditFormData(prev => prev ? { ...prev, logoFile: null, bannerFile: null } : null) 
      setLogoPreview(updatedData.logo_url || null);
      setBannerPreview(updatedData.banner_url || null);
      toast.success('Alterações guardadas com sucesso!')

    } catch (err: any) {
      console.error('Erro completo em handleSaveChanges:', err)
      toast.error(`Erro ao guardar: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Function to handle copying the public link
  const handleCopyLink = () => {
    if (!organizationData?.slug) return;
    const publicUrl = `${window.location.origin}/organizacao/${organizationData.slug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast.success("Link da página pública copiado!");
      setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error("Erro ao copiar link: ", err);
      toast.error("Não foi possível copiar o link.");
    });
  };

  // Combined loading state
  const showLoading = isOrgLoading || isLoadingDetails;

  if (showLoading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Organização</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" /> 
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <div className="flex justify-center py-10">
                <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Organização</h1>
        <Card className="border-fuchsia-300 bg-fuchsia-50">
          <CardHeader>
            <CardTitle className="text-fuchsia-700 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Erro ao Carregar Dados
            </CardTitle>
            <CardDescription className="text-fuchsia-600">
              {error}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!currentOrganization) {
       return (
         <div className="container py-8">
           <h1 className="text-3xl font-bold mb-6">Organização</h1>
           <Card className="bg-gray-50 border-dashed border-2 border-gray-200">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <AlertCircle className="h-5 w-5 text-fuchsia-500" /> Nenhuma Organização Encontrada
               </CardTitle>
               <CardDescription>
                 Este utilizador não parece estar associado a nenhuma organização.
               </CardDescription>
             </CardHeader>
           </Card>
         </div>
       )
  }
  
  if (!editFormData) { 
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Organização</h1>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
            <h3 className="text-xl font-medium">Carregando dados da organização...</h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Gerir Organização</h1>
      
      {/* Use grid layout for form and preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Form Card (takes 2 columns on large screens) */}
         <Card className="lg:col-span-2 border-l-4 border-l-lime-500">
          <CardHeader>
            {/* Display name from state if available, otherwise from fetched data */}
            <CardTitle>
              <span className="text-gray-900">{editFormData?.name || organizationData?.name || 'Organização'}</span>
            </CardTitle>
            <CardDescription>
              Aqui pode editar os detalhes da sua organização.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveChanges} className="space-y-6">
              {/* Form fields... */}
              <div>
                <Label htmlFor="name">Nome da Organização</Label>
                <Input
                  id="name"
                  name="name" // Adicionado name para handleInputChange
                  required
                  value={editFormData.name}
                  onChange={handleInputChange}
                  placeholder="Nome da organização"
                  disabled={isSaving}
                />
              </div>
   
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={handleInputChange}
                  placeholder="email@organizacao.com"
                  disabled={isSaving}
                />
              </div>
   
              <div>
                <Label htmlFor="address">Morada</Label>
                <Input
                  id="address"
                  name="address"
                  required
                  value={editFormData.address}
                  onChange={handleInputChange}
                  placeholder="Morada da organização"
                  disabled={isSaving}
                />
              </div>
   
              <div>
                <Label htmlFor="contacts">Telemóvel</Label>
                <Input
                  id="contacts"
                  name="contacts"
                  type="tel"
                  required
                  value={editFormData.contacts}
                  onChange={handleInputChange}
                  placeholder="912345678"
                  disabled={isSaving}
                />
              </div>
   
              {/* Redes Sociais */}
              <div className="space-y-4 pt-4 border-t">
                <Label className="font-semibold text-fuchsia-600">Redes Sociais</Label>
                <div>
                  <Label htmlFor="instagram">Instagram (URL Completo)</Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    value={editFormData.instagram}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/suaorganizacao"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook (URL Completo)</Label>
                  <Input
                    id="facebook"
                    name="facebook"
                    value={editFormData.facebook}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/suaorganizacao"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="youtube">YouTube (URL Completo)</Label>
                  <Input
                    id="youtube"
                    name="youtube"
                    value={editFormData.youtube}
                    onChange={handleInputChange}
                    placeholder="https://youtube.com/c/seu-canal"
                    disabled={isSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="tiktok">TikTok (URL Completo)</Label>
                  <Input
                    id="tiktok"
                    name="tiktok"
                    value={editFormData.tiktok}
                    onChange={handleInputChange}
                    placeholder="https://tiktok.com/@seu-usuario"
                    disabled={isSaving}
                  />
                </div>
              </div>
   
              {/* Upload de Imagens */}
              <div className="space-y-6 pt-4 border-t">
                <Label className="font-semibold text-lime-600">Imagens</Label>
                {/* Logo */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-start'>
                  <div>
                    <Label htmlFor="logo">Logo da Organização</Label>
                    {/* Always render the container div */}
                    <div className="mt-2 mb-2 w-24 h-24 rounded-full overflow-hidden border bg-gray-50 flex items-center justify-center">
                      {logoPreview ? (
                        <Image src={logoPreview} alt="Preview Logo" width={96} height={96} className="object-contain" />
                      ) : (
                        // Placeholder when no image preview is available
                        <span className="text-xs text-muted-foreground">Sem logo</span>
                      )}
                    </div>
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo')?.click()}
                      className="w-full hover:border-fuchsia-500 hover:text-fuchsia-600"
                      disabled={isSaving}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {editFormData.logoFile ? editFormData.logoFile.name : 'Alterar Logo'}
                    </Button>
                    {!editFormData.logoFile && organizationData?.logo_url && (
                       <p className="text-xs text-muted-foreground mt-1">Atual: {organizationData.logo_url.split('/').pop()}</p> 
                    )}
                  </div>
   
                  {/* Banner */}
                  <div>
                    <Label htmlFor="banner">Banner da Organização</Label>
                    {/* Always render the container div */}
                    <div className="mt-2 mb-2 w-full h-32 rounded-md overflow-hidden border bg-gray-50 flex items-center justify-center">
                      {bannerPreview ? (
                        <Image src={bannerPreview} alt="Preview Banner" width={500} height={128} className="object-cover" />
                      ) : (
                        // Placeholder when no image preview is available
                        <span className="text-sm text-muted-foreground">Sem banner</span>
                      )}
                    </div>
                    <Input
                      id="banner"
                      type="file"
                      accept="image/*"
                      onChange={handleBannerChange}
                      className="hidden"
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('banner')?.click()}
                      className="w-full hover:border-fuchsia-500 hover:text-fuchsia-600"
                      disabled={isSaving}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {editFormData.bannerFile ? editFormData.bannerFile.name : 'Alterar Banner'}
                    </Button>
                     {!editFormData.bannerFile && organizationData?.banner_url && (
                       <p className="text-xs text-muted-foreground mt-1">Atual: {organizationData.banner_url.split('/').pop()}</p> 
                    )}
                  </div>
                </div>
              </div>
              
              {/* Botão de Guardar */}
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isSaving || showLoading} className="bg-lime-500 hover:bg-lime-600 text-white">
                  {isSaving ? 'Guardando...' : 'Guardar Alterações'}
                  <Save className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Column (takes 1 column on large screens) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Preview Card */}
          <Card className="sticky top-8 border-l-4 border-l-fuchsia-500">
             <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
                <CardDescription>Como a sua organização aparecerá.</CardDescription>
             </CardHeader>
             <CardContent>
                {/* Render the preview component, passing form data */}
                {editFormData && (
                   <OrganizationPreview 
                      name={editFormData.name}
                      email={editFormData.email}
                      address={editFormData.address}
                      logo={editFormData.logoFile || logoPreview || undefined}
                      banner={editFormData.bannerFile || bannerPreview || undefined}
                      instagram={editFormData.instagram}
                      facebook={editFormData.facebook}
                      youtube={editFormData.youtube}
                      tiktok={editFormData.tiktok}
                   />
                )}
             </CardContent>
          </Card>

          {/* Public Link Section - Only show if slug exists */}
          {organizationData?.slug && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link Público</CardTitle>
                <CardDescription className="text-xs">Partilhe este link para a página da sua organização.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={`${window.location.origin}/organizacao/${organizationData.slug}`}
                  className="text-xs flex-1"
                />
                <Button type="button" size="icon" variant="outline" onClick={handleCopyLink} className="hover:text-fuchsia-600 hover:border-fuchsia-500">
                  {copied ? <Check className="h-4 w-4 text-lime-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 