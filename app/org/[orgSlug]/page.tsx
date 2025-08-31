// Server Component para página pública da organização
import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Database } from '@/lib/database.types'
import OrgPublicClient from './OrgPublicClient'

interface PageProps {
  params: Promise<{ orgSlug: string }>
}

// Função para validar slug da organização
function validateOrgSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 50 && slug.length >= 3
}

export default async function OrgPublicPage(props: PageProps) {
  const { orgSlug } = await props.params
  
  // Validar formato do slug
  if (!validateOrgSlug(orgSlug)) {
    notFound()
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    // Verificar se a organização existe
    const { data: orgExists, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .single()

    if (error || !orgExists) {
      notFound()
    }

    return <OrgPublicClient orgSlug={orgSlug} />
  } catch (error) {
    console.error('Erro ao verificar organização:', error?.message || 'Erro desconhecido')
    notFound()
  }
}

// Metadata para SEO
export async function generateMetadata(props: PageProps) {
  const { orgSlug } = await props.params
  
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, address')
      .eq('slug', orgSlug)
      .single()

    if (org) {
      return {
        title: `${org.name} - Eventos`,
        description: `Descubra os próximos eventos de ${org.name}${org.address ? ` em ${org.address}` : ''}`,
        openGraph: {
          title: `${org.name} - Eventos`,
          description: `Descubra os próximos eventos de ${org.name}`,
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: `${org.name} - Eventos`,
          description: `Descubra os próximos eventos de ${org.name}`,
        }
      }
    }
  } catch (error) {
    // Fallback metadata
  }

  return {
    title: 'Organização - Eventos',
    description: 'Descubra os próximos eventos desta organização',
  }
}
