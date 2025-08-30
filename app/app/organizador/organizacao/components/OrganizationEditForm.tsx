import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, Save, Copy, Check } from 'lucide-react'
import Image from 'next/image'
import { EditFormData, OrganizationData } from '../types/Organization'

interface OrganizationEditFormProps {
  editFormData: EditFormData
  organizationData: OrganizationData
  logoPreview: string | null
  bannerPreview: string | null
  isSaving: boolean
  copied: boolean
  showLoading: boolean
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  handleLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBannerChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleSaveChanges: (e: React.FormEvent) => void
  handleCopyLink: () => void
}

// ✅ COMPONENTE DE FORMULÁRIO DE EDIÇÃO (Complexidade: 5 pontos)
export const OrganizationEditForm = ({
  editFormData,
  organizationData,
  logoPreview,
  bannerPreview,
  isSaving,
  copied,
  showLoading,
  handleInputChange,
  handleLogoChange,
  handleBannerChange,
  handleSaveChanges,
  handleCopyLink
}: OrganizationEditFormProps) => {
  return (
    <div className="lg:col-span-1 space-y-6">
      <Card className="border-l-4 border-l-lime-500">
        <CardHeader>
          <CardTitle>Editar Organização</CardTitle>
          <CardDescription>
            Altere os dados da sua organização. As alterações serão refletidas na página pública.
          </CardDescription>
          {organizationData?.slug && ( // +1
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs"
              >
                {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />} // +1 (?:)
                {copied ? 'Copiado!' : 'Copiar Link Público'}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveChanges} className="space-y-6">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Organização *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={editFormData.name}
                  onChange={handleInputChange}
                  required
                  disabled={isSaving}
                  className="focus:border-lime-500 focus:ring-lime-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de Contacto *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={handleInputChange}
                  required
                  disabled={isSaving}
                  className="focus:border-lime-500 focus:ring-lime-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Morada</Label>
              <textarea
                id="address"
                name="address"
                value={editFormData.address}
                onChange={handleInputChange}
                disabled={isSaving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-lime-500 resize-none"
                rows={3}
                placeholder="Morada completa da organização"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contacts">Contactos</Label>
              <Input
                id="contacts"
                name="contacts"
                type="text"
                value={editFormData.contacts}
                onChange={handleInputChange}
                disabled={isSaving}
                className="focus:border-lime-500 focus:ring-lime-500"
                placeholder="Telefone, WhatsApp, etc."
              />
            </div>

            {/* Redes Sociais */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Redes Sociais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    name="instagram"
                    type="text"
                    value={editFormData.instagram}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="focus:border-lime-500 focus:ring-lime-500"
                    placeholder="@username ou URL completa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    name="facebook"
                    type="text"
                    value={editFormData.facebook}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="focus:border-lime-500 focus:ring-lime-500"
                    placeholder="URL da página"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input
                    id="youtube"
                    name="youtube"
                    type="text"
                    value={editFormData.youtube}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="focus:border-lime-500 focus:ring-lime-500"
                    placeholder="URL do canal"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok</Label>
                  <Input
                    id="tiktok"
                    name="tiktok"
                    type="text"
                    value={editFormData.tiktok}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="focus:border-lime-500 focus:ring-lime-500"
                    placeholder="@username ou URL completa"
                  />
                </div>
              </div>
            </div>

            {/* Upload de Imagens */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Imagens</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Logo da Organização</Label>
                  <div className="space-y-2">
                    {logoPreview && ( // +1
                      <div className="relative w-24 h-24 mx-auto">
                        <Image
                          src={logoPreview}
                          alt="Preview do logo"
                          fill
                          className="object-cover rounded-lg border"
                        />
                      </div>
                    )}
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
                      className="w-full hover:border-lime-500 hover:text-lime-600"
                      disabled={isSaving}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {editFormData.logoFile ? editFormData.logoFile.name : 'Alterar Logo'} // +1 (?:)
                    </Button>
                    {!editFormData.logoFile && organizationData?.logo_url && ( // +1 (&&)
                      <p className="text-xs text-muted-foreground mt-1">
                        Atual: {organizationData.logo_url.split('/').pop()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Banner Upload */}
                <div className="space-y-2">
                  <Label htmlFor="banner">Banner da Organização</Label>
                  <div className="space-y-2">
                    {bannerPreview && ( // +1
                      <div className="relative w-full h-24 mx-auto">
                        <Image
                          src={bannerPreview}
                          alt="Preview do banner"
                          fill
                          className="object-cover rounded-lg border"
                        />
                      </div>
                    )}
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
                      {editFormData.bannerFile ? editFormData.bannerFile.name : 'Alterar Banner'} // +1 (?:)
                    </Button>
                    {!editFormData.bannerFile && organizationData?.banner_url && ( // +1 (&&)
                      <p className="text-xs text-muted-foreground mt-1">
                        Atual: {organizationData.banner_url.split('/').pop()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Guardar */}
            <div className="flex justify-end pt-4 border-t">
              <Button 
                type="submit" 
                disabled={isSaving || showLoading} 
                className="bg-lime-500 hover:bg-lime-600 text-white"
              >
                {isSaving ? 'Guardando...' : 'Guardar Alterações'}
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
