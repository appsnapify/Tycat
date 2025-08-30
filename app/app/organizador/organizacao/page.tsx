"use client"

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { OrganizationPreview } from '@/components/organization-preview'

// ✅ IMPORTS DOS COMPONENTES REFATORADOS
import { useOrganizationData } from './hooks/useOrganizationData'
import { useOrganizationForm } from './hooks/useOrganizationForm'
import { OrganizationLoading } from './components/OrganizationLoading'
import { OrganizationEditForm } from './components/OrganizationEditForm'

// ✅ COMPONENTE PRINCIPAL REFATORADO (Complexidade: 4 pontos)
export default function OrganizacaoPage() {
  const {
    organizationData,
    setOrganizationData,
    error,
    showLoading,
  } = useOrganizationData()

  const {
    isSaving,
    editFormData,
    logoPreview,
    bannerPreview,
    copied,
    handleInputChange,
    handleLogoChange,
    handleBannerChange,
    handleSaveChanges,
    handleCopyLink
  } = useOrganizationForm(organizationData, setOrganizationData)

  if (showLoading) { // +1
    return <OrganizationLoading />
  }

  if (error) { // +1
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!organizationData || !editFormData) { // +1 (||)
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Nenhuma organização encontrada.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return ( // +1
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <OrganizationEditForm
          editFormData={editFormData}
          organizationData={organizationData}
          logoPreview={logoPreview}
          bannerPreview={bannerPreview}
          isSaving={isSaving}
          copied={copied}
          showLoading={showLoading}
          handleInputChange={handleInputChange}
          handleLogoChange={handleLogoChange}
          handleBannerChange={handleBannerChange}
          handleSaveChanges={handleSaveChanges}
          handleCopyLink={handleCopyLink}
        />

        {/* Preview Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-8 border-l-4 border-l-fuchsia-500">
             <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
                <CardDescription>Como a sua organização aparecerá.</CardDescription>
             </CardHeader>
             <CardContent>
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
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 