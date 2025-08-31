'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import HeroSection from './components/HeroSection'
import SocialLinks from './components/SocialLinks'
import EventsGrid from './components/EventsGrid'
import PastEventsSection from './components/PastEventsSection'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorMessage from './components/ErrorMessage'

// Initialize Supabase client
const supabase = createClient()

interface Organization {
  id: string
  name: string
  address: string
  contacts: string
  social_media?: {
    instagram?: string
    facebook?: string
    youtube?: string
    tiktok?: string
    twitter?: string
    website?: string
  }
  logo_url: string
  banner_url: string
  slug: string
}

interface Event {
  id: string
  title: string
  description: string
  date: string
  time?: string
  end_date?: string
  end_time?: string
  location: string
  flyer_url: string
  event_type?: string
  is_published: boolean
  event_slugs?: { slug: string }[]
}

interface OrgPublicClientProps {
  orgSlug: string
}

export default function OrgPublicClient({ orgSlug }: OrgPublicClientProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrganizationData()
  }, [orgSlug])

  const loadOrganizationData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Buscar dados da organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, address, contacts, logo_url, banner_url, social_media, slug')
        .eq('slug', orgSlug)
        .single()

      if (orgError) throw new Error('Organização não encontrada')
      
      setOrganization(org)

      // Buscar eventos em paralelo
      const [upcomingResult, pastResult] = await Promise.allSettled([
        loadUpcomingEvents(org.id),
        loadPastEvents(org.id)
      ])

      // Processar resultados
      if (upcomingResult.status === 'fulfilled') {
        setUpcomingEvents(upcomingResult.value)
      }
      
      if (pastResult.status === 'fulfilled') {
        setPastEvents(pastResult.value)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Background decorativo igual ao /promotores */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={error} />
        ) : organization ? (
          <>
            <HeroSection organization={organization} />
            <SocialLinks socialMedia={organization.social_media} />
            <EventsGrid 
              events={upcomingEvents} 
              organizationSlug={orgSlug}
              title="Próximos Eventos"
            />
            <PastEventsSection 
              events={pastEvents}
              organizationSlug={orgSlug}
            />
          </>
        ) : (
          <ErrorMessage message="Organização não encontrada" />
        )}
      </div>
    </div>
  )
}

// Função auxiliar para carregar eventos próximos
async function loadUpcomingEvents(orgId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_slugs!left (
        slug
      )
    `)
    .eq('organization_id', orgId)
    .eq('is_published', true)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(12)

  if (error) throw error
  return data || []
}

// Função auxiliar para carregar eventos passados
async function loadPastEvents(orgId: string): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_slugs!left (
        slug
      )
    `)
    .eq('organization_id', orgId)
    .eq('is_published', true)
    .lt('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: false })
    .limit(12)

  if (error) throw error
  return data || []
}
