import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { OrganizationData, EditFormData } from '../types/Organization'

// ✅ HOOK PERSONALIZADO: useOrganizationForm (Complexidade: 8 pontos)
export const useOrganizationForm = (
  organizationData: OrganizationData | null,
  setOrganizationData: (data: OrganizationData) => void
) => {
  const supabase = createClient()
  const [isSaving, setIsSaving] = useState(false)
  const [editFormData, setEditFormData] = useState<EditFormData | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (organizationData) { // +1
      setEditFormData({
        name: organizationData.name || '',
        email: organizationData.email || '',
        address: organizationData.address || '',
        contacts: organizationData.contacts || '',
        instagram: organizationData.social_media?.instagram || '',
        facebook: organizationData.social_media?.facebook || '',
        youtube: organizationData.social_media?.youtube || '',
        tiktok: organizationData.social_media?.tiktok || '',
        logoFile: null,
        bannerFile: null,
      });
      setLogoPreview(organizationData.logo_url || null);
      setBannerPreview(organizationData.banner_url || null);
    }
  }, [organizationData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { // +1
      setEditFormData(prev => prev ? { ...prev, logoFile: file } : null);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { // +1
      setEditFormData(prev => prev ? { ...prev, bannerFile: file } : null);
      const previewUrl = URL.createObjectURL(file);
      setBannerPreview(previewUrl);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !organizationData) return; // +1

    setIsSaving(true);
    const currentOrgId = organizationData.id;

    try { // +1
      let logoUrl = organizationData.logo_url;
      let bannerUrl = organizationData.banner_url;

      if (editFormData.logoFile) { // +1
        const logoFile = editFormData.logoFile;
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `public/${currentOrgId}/logo-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('organization_logos')
          .upload(filePath, logoFile);

        if (uploadError) throw new Error(uploadError.message || 'Falha no upload do logo.'); // +1

        const { data: urlData } = supabase.storage.from('organization_logos').getPublicUrl(filePath);
        logoUrl = urlData.publicUrl;
      }

      if (editFormData.bannerFile) { // +1
        const bannerFile = editFormData.bannerFile;
        const fileExt = bannerFile.name.split('.').pop();
        const filePath = `public/${currentOrgId}/banner-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('organization_banners')
          .upload(filePath, bannerFile);

        if (uploadError) throw new Error(uploadError.message || 'Falha no upload do banner.'); // +1

        const { data: urlData } = supabase.storage.from('organization_banners').getPublicUrl(filePath);
        bannerUrl = urlData.publicUrl;
      }

      const updatePayload = {
        name: editFormData.name,
        email: editFormData.email,
        address: editFormData.address,
        contacts: editFormData.contacts,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        social_media: {
          ...(organizationData.social_media || {}),
          instagram: editFormData.instagram || null,
          facebook: editFormData.facebook || null,
          youtube: editFormData.youtube || null,
          tiktok: editFormData.tiktok || null,
          twitter: organizationData.social_media?.twitter || null,
          website: organizationData.social_media?.website || null,
        },
        updated_at: new Date().toISOString(),
      };

      const { data: updatedData, error: updateError } = await supabase
        .from('organizations')
        .update(updatePayload)
        .eq('id', currentOrgId)
        .select()
        .single();

      if (updateError) throw new Error(updateError.message || 'Falha ao guardar alterações.'); // +1

      setOrganizationData(updatedData);
      setEditFormData(prev => prev ? { ...prev, logoFile: null, bannerFile: null } : null);
      setLogoPreview(updatedData.logo_url || null);
      setBannerPreview(updatedData.banner_url || null);
      toast.success('Alterações guardadas com sucesso!');

    } catch (err: any) {
      console.error('Erro completo em handleSaveChanges:', err);
      toast.error(`Erro ao guardar: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!organizationData?.slug) return; // +1
    const publicUrl = `${window.location.origin}/organizacao/${organizationData.slug}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      toast.success("Link da página pública copiado!");
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error("Erro ao copiar link: ", err);
      toast.error("Não foi possível copiar o link.");
    });
  };

  return {
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
  }
}
