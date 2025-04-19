"use client"

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Loader2, Instagram, Facebook, Youtube, Twitter, Globe, Music } from 'lucide-react'

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
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })

        if (upcomingError) throw upcomingError
        setUpcomingEvents(upcoming || [])

        const { data: past, error: pastError } = await supabase
          .from('events')
          .select('*')
          .eq('organization_id', org.id)
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
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-64 bg-gray-200">
        {organization.banner_url ? (
          <Image
            src={organization.banner_url}
            alt="Banner da organização"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-gray-400">Sem banner</p>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative">
          <div className="absolute -top-16 left-4">
            <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-white">
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
                  <p className="text-gray-400">Sem logo</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-20">
            <h1 className="text-3xl font-bold text-gray-900">{organization.name}</h1>

            <div className="mt-4 space-y-2">
              <p className="text-gray-600">{organization.address}</p>
              <p className="text-gray-600">{organization.contacts}</p>
            </div>

            <div className="mt-6 flex space-x-5 items-center">
               {renderSocialLink('instagram', organization.social_media?.instagram)}
               {renderSocialLink('facebook', organization.social_media?.facebook)}
               {renderSocialLink('youtube', organization.social_media?.youtube)}
               {renderSocialLink('tiktok', organization.social_media?.tiktok)}
               {renderSocialLink('twitter', organization.social_media?.twitter)}
               {renderSocialLink('website', organization.social_media?.website)}
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Próximos Eventos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <Link href={`/g/${event.id}`} key={event.id} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
                  <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
                    <div className="relative h-48 flex-shrink-0">
                      {event.flyer_url ? (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <p className="text-gray-400">Sem imagem</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{event.description}</p>
                    </div>
                    <div className="p-4 pt-0 mt-auto text-sm text-gray-500">
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                      <p>{event.location}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Eventos Passados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pastEvents.map((event) => (
                <Link href={`/g/${event.id}`} key={event.id} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
                  <div className="bg-white rounded-lg shadow overflow-hidden h-full flex flex-col">
                    <div className="relative h-48 flex-shrink-0">
                      {event.flyer_url ? (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <p className="text-gray-400">Sem imagem</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-grow">
                      <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{event.description}</p>
                    </div>
                    <div className="p-4 pt-0 mt-auto text-sm text-gray-500">
                      <p>{new Date(event.date).toLocaleDateString()}</p>
                      <p>{event.location}</p>
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