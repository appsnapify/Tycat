"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Loader2, Instagram, Facebook, Youtube, Twitter, Globe, Music, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

// Initialize Supabase client
const supabase = createClient();

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
}

interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  flyer_url: string
  event_slugs?: { slug: string }[] // Relação com event_slugs
}

interface OrganizationClientProps {
  slug: string
}

const renderSocialLink = (type: string, url?: string) => {
  if (!url) return null;

  const icons = {
    instagram: <Instagram className="h-6 w-6" />,
    facebook: <Facebook className="h-6 w-6" />,
    youtube: <Youtube className="h-6 w-6" />,
    tiktok: <Music className="h-6 w-6" />,
    twitter: <Twitter className="h-6 w-6" />,
    website: <Globe className="h-6 w-6" />
  };

  const ensureFullUrl = (link: string) => {
     if (link.startsWith('http://') || link.startsWith('https://')) {
        return link;
     }
     return `https://${link}`;
  }

  return (
    <a 
      href={ensureFullUrl(url)}
      target="_blank" 
      rel="noopener noreferrer"
      className="text-slate-300 hover:text-white transition-colors duration-300 transform hover:scale-110"
      aria-label={type}
    >
      {icons[type as keyof typeof icons] || <Globe className="h-6 w-6" />}
    </a>
  );
};

export default function OrganizationClient({ slug }: OrganizationClientProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Helper para construir URL do evento
  const getEventUrl = (event: Event) => {
    const eventSlug = event.event_slugs?.[0]?.slug;
    if (eventSlug) {
      return `/organizacao/${slug}/${eventSlug}`;
    }
    // Fallback para o sistema antigo se não houver slug
    return `/g/${event.id}`;
  }

  useEffect(() => {
    async function loadOrganization() {
      try {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, address, contacts, logo_url, banner_url, social_media')
          .eq('slug', slug)
          .single()

        if (orgError) throw orgError
        setOrganization(org)

        const { data: upcoming, error: upcomingError } = await supabase
          .from('events')
          .select(`
            *,
            event_slugs!left (
              slug
            )
          `)
          .eq('organization_id', org.id)
          .eq('is_published', true)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })

        if (upcomingError) throw upcomingError
        setUpcomingEvents(upcoming ?? [])

        const { data: past, error: pastError } = await supabase
          .from('events')
          .select(`
            *,
            event_slugs!left (
              slug
            )
          `)
          .eq('organization_id', org.id)
          .eq('is_published', true)
          .lt('date', new Date().toISOString())
          .order('date', { ascending: false })

        if (pastError) throw pastError
        setPastEvents(past ?? [])
      } catch (error) {
        console.error('Erro ao carregar organização:', error?.message || 'Erro desconhecido')
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [slug])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <Loader2 className="h-10 w-10 animate-spin text-slate-300" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <p className="text-slate-300 text-lg font-medium">Organização não encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 font-sans text-slate-100">
      {/* Header with banner and logo */}
      <div className="relative h-80 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/80 z-10" />
        {organization.banner_url ? (
          <Image
            src={organization.banner_url}
            alt="Banner da organização"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-800 to-slate-700">
            <p className="text-slate-400">Sem banner</p>
          </div>
        )}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-20">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 shadow-xl bg-slate-700">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt="Logo da organização"
                width={128}
                height={128}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-slate-400 text-center">Sem logo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Organization info */}
        <div className="mt-20 flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-300">
            {organization.name}
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-300">{organization.address}</p>

          <div className="mt-6 flex space-x-6 items-center justify-center">
             {renderSocialLink('instagram', organization.social_media?.instagram)}
             {renderSocialLink('facebook', organization.social_media?.facebook)}
             {renderSocialLink('youtube', organization.social_media?.youtube)}
             {renderSocialLink('tiktok', organization.social_media?.tiktok)}
             {renderSocialLink('twitter', organization.social_media?.twitter)}
             {renderSocialLink('website', organization.social_media?.website)}
          </div>
        </div>

        {/* Events sections */}
        <div className="mt-16">
          {/* Upcoming events */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold tracking-tight mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Próximos Eventos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingEvents.length === 0 ? (
                <p className="text-slate-400 col-span-full text-center py-8">Não existem eventos futuros agendados</p>
              ) : (
                upcomingEvents.map((event) => (
                  <Link href={getEventUrl(event)} key={event.id} className="block no-underline group">
                    <div className="relative flex flex-col rounded-xl bg-slate-800/50 backdrop-blur-sm text-slate-100 shadow-lg h-full overflow-hidden border border-slate-700/50 transition-all duration-300 hover:shadow-blue-500/20 hover:-translate-y-1">
                      <div className="relative h-48 overflow-hidden">
                        {event.flyer_url ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 opacity-60" />
                            <Image
                              src={event.flyer_url}
                              alt={event.title}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-800 to-slate-700">
                            <p className="text-slate-400">Sem imagem</p>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 z-20 bg-blue-500/90 backdrop-blur-sm p-2 rounded-md shadow-lg text-center">
                          <span className="block text-xs font-bold uppercase text-white tracking-wide">
                            {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')}
                          </span>
                          <span className="block text-xl font-bold text-white leading-tight">
                            {new Date(event.date).getDate()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold leading-snug tracking-tight text-slate-100 mb-3 group-hover:text-blue-400 transition-colors">
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-300 line-clamp-2 mb-4">
                          {event.description}
                        </p>
                        <div className="mt-auto">
                          <span className="inline-flex items-center justify-center rounded-md bg-blue-600/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors group-hover:bg-blue-600/30">
                            Ver Detalhes
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Past events */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-10 bg-clip-text text-transparent bg-gradient-to-r from-slate-400 to-slate-500">
              Eventos Passados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pastEvents.length === 0 ? (
                <p className="text-slate-400 col-span-full text-center py-8">Não existem eventos passados</p>
              ) : (
                pastEvents.map((event) => (
                  <div key={event.id} className="block no-underline">
                    <div className="relative flex flex-col rounded-xl bg-slate-800/30 backdrop-blur-sm text-slate-400 shadow-md h-full overflow-hidden border border-slate-700/30">
                      <div className="relative h-48 overflow-hidden">
                        {event.flyer_url ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 opacity-80" />
                            <Image
                              src={event.flyer_url}
                              alt={event.title}
                              fill
                              className="object-cover grayscale"
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-slate-800 to-slate-700">
                            <p className="text-slate-500">Sem imagem</p>
                          </div>
                        )}
                        
                        <div className="absolute top-4 right-4 z-20 bg-slate-700/90 backdrop-blur-sm p-2 rounded-md shadow-md text-center">
                          <span className="block text-xs font-bold uppercase text-slate-400 tracking-wide">
                            {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')}
                          </span>
                          <span className="block text-xl font-bold text-slate-400 leading-tight">
                            {new Date(event.date).getDate()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6 flex flex-col flex-grow">
                        <h3 className="text-xl font-bold leading-snug tracking-tight text-slate-400 mb-3">
                          {event.title}
                        </h3>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {event.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 