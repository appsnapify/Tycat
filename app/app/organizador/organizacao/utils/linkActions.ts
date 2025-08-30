import { toast } from 'sonner'
import { OrganizationData } from '../types/Organization'

// ✅ FUNÇÃO: copyOrganizationLink (Complexidade: 4 pontos)
export const copyOrganizationLink = (
  organizationData: OrganizationData | null,
  setCopied: (copied: boolean) => void
) => {
  if (!organizationData?.slug) return // +1
  const link = `${window.location.origin}/organizacao/${organizationData.slug}`
  navigator.clipboard.writeText(link).then(() => { // +1
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 2000)
  }).catch(() => { // +1
    toast.error('Erro ao copiar link')
  })
}
