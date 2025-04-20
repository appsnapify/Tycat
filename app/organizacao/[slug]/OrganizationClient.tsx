"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, Instagram, Facebook, Youtube, Twitter, Globe, Music, ClipboardList } from 'lucide-react'

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
      className="text-gray-500 hover:text-gray-700 transition-colors"
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
          .select('*')
          .eq('organization_id', org.id)
          .eq('is_published', true)
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })

        if (upcomingError) throw upcomingError
        setUpcomingEvents(upcoming || [])

        const { data: past, error: pastError } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', org.id)
          .eq('is_published', true)
          .lt('date', new Date().toISOString())
          .order('date', { ascending: false })

        if (pastError) throw pastError
        setPastEvents(past || [])
      } catch (error) {
        console.error('Erro ao carregar organização:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadOrganization()
  }, [slug])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-gray-500">Organização não encontrada</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="relative h-64 bg-gray-200 shadow-lg shadow-black/20">
        {organization.banner_url ? (
          <Image
            src={organization.banner_url}
            alt="Banner da organização"
            fill
            className="object-cover rounded-t-lg"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center rounded-t-lg">
            <p className="text-gray-400">Sem banner</p>
          </div>
        )}
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
          <div className="w-28 h-28 rounded-full bg-gray-200 overflow-hidden border-8 border-white shadow-md">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt="Logo da organização"
                width={112}
                height={112}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-gray-400 text-center">Sem logo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="mt-16 flex flex-col items-center text-center font-oswald">
          <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
          <p className="mt-2 text-lg font-semibold text-gray-600">{organization.address}</p>

          <div className="mt-4 flex space-x-4 items-center justify-center">
             {renderSocialLink('instagram', organization.social_media?.instagram)}
             {renderSocialLink('facebook', organization.social_media?.facebook)}
             {renderSocialLink('youtube', organization.social_media?.youtube)}
             {renderSocialLink('tiktok', organization.social_media?.tiktok)}
             {renderSocialLink('twitter', organization.social_media?.twitter)}
             {renderSocialLink('website', organization.social_media?.website)}
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-10">Próximos Eventos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {upcomingEvents.map((event) => (
                <Link href={`/g/${event.id}`} key={event.id} className="block no-underline group">
                  <div className="relative flex w-full flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md shadow-black/20 h-full">
                    <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg bg-gray-200">
                      {event.flyer_url ? (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-400">Sem imagem</p>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow relative">
                      <div className="absolute top-8 right-4 bg-blue-50 p-2 rounded-md shadow-sm text-center">
                        <span className="block text-xs font-bold uppercase text-blue-600 tracking-wide">
                          {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')}
                        </span>
                        <span className="block text-xl font-bold text-blue-600 leading-tight">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>

                      <h5 className="mb-4 block font-oswald text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased">
                        {event.title}
                      </h5>
                    </div>
                    <div className="p-6 pt-0 flex justify-center">
                       <span className="select-none rounded-lg bg-blue-500 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20">
                         Ver Evento
                       </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-10">Eventos Passados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-12">
              {pastEvents.map((event) => (
                <Link href={`/g/${event.id}`} key={event.id} className="block no-underline group">
                  <div className="relative flex w-full flex-col rounded-xl bg-white bg-clip-border text-gray-700 shadow-md shadow-black/20 h-full">
                    <div className="relative mx-4 -mt-6 h-40 overflow-hidden rounded-xl bg-clip-border text-white shadow-lg bg-gray-200">
                      {event.flyer_url ? (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <p className="text-gray-400">Sem imagem</p>
                        </div>
                      )}
                    </div>
                    <div className="p-6 flex flex-col flex-grow relative">
                      <div className="absolute top-8 right-4 bg-blue-50 p-2 rounded-md shadow-sm text-center">
                        <span className="block text-xs font-bold uppercase text-blue-600 tracking-wide">
                          {new Date(event.date).toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')}
                        </span>
                        <span className="block text-xl font-bold text-blue-600 leading-tight">
                          {new Date(event.date).getDate()}
                        </span>
                      </div>

                      <h5 className="mb-4 block font-oswald text-xl font-semibold leading-snug tracking-normal text-blue-gray-900 antialiased">
                        {event.title}
                      </h5>
                    </div>
                    <div className="p-6 pt-0 flex justify-center">
                       <span className="select-none rounded-lg bg-blue-500 py-2 px-4 text-center align-middle font-sans text-xs font-bold uppercase text-white shadow-md shadow-blue-500/20">
                         Ver Evento
                       </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 