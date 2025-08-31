import Image from 'next/image'
import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  date: string
  time?: string
  location: string
  flyer_url: string
  event_type?: string
  event_slugs?: { slug: string }[]
}

interface EventCardPublicProps {
  event: Event
  organizationSlug: string
  priority?: boolean
}

// Função para formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '')
  }
}

// Função para construir URL do evento
const getEventUrl = (event: Event, orgSlug: string) => {
  const eventSlug = event.event_slugs?.[0]?.slug
  if (eventSlug) {
    return `/org/${orgSlug}/${eventSlug}`
  }
  // Fallback para o sistema antigo
  return `/g/${event.id}`
}

export default function EventCardPublic({ event, organizationSlug, priority = false }: EventCardPublicProps) {
  const { day, month } = formatDate(event.date)
  const eventUrl = getEventUrl(event, organizationSlug)
  
  // Determinar tipo de etiqueta baseado no event_type (com fallback seguro)
  const getEventLabel = () => {
    // Verificar se event_type existe e tem valor
    if (event.event_type) {
      if (event.event_type === 'guest-list' || event.event_type === 'guest_list') {
        return { text: 'Guest', color: 'bg-emerald-500' }
      } else if (event.event_type === 'ticket' || event.event_type === 'bilhete') {
        return { text: 'Bilhetes', color: 'bg-violet-500' }
      }
    }
    
    // Fallback baseado no título ou descrição se event_type não existir
    const eventText = `${event.title} ${event.description || ''}`.toLowerCase()
    if (eventText.includes('bilhete') || eventText.includes('ticket')) {
      return { text: 'Bilhetes', color: 'bg-violet-500' }
    }
    
    // Default para guest
    return { text: 'Guest', color: 'bg-emerald-500' }
  }
  
  const eventLabel = getEventLabel()

  return (
    <Link 
      href={eventUrl}
      className="block group"
    >
      <div className="relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] bg-white">
        {/* Imagem do evento - altura fixa igual eventos realizados */}
        <div className="relative h-48">
          {event.flyer_url ? (
            <Image
              src={event.flyer_url}
              alt={event.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              priority={priority}
              loading={priority ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-violet-100 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-emerald-500" />
            </div>
          )}
          
          {/* Badge de data */}
          <div className="absolute top-4 right-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              <div className="text-center">
                <div className="text-xs text-slate-600 uppercase font-medium">
                  {month}
                </div>
                <div className="text-lg font-bold text-slate-800">
                  {day}
                </div>
              </div>
            </div>
          </div>

          {/* Etiqueta Guest/Bilhetes */}
          <div className="absolute top-4 left-4">
            <div className={`${eventLabel.color} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg`}>
              {eventLabel.text}
            </div>
          </div>
        </div>
        
        {/* Informações do evento - abaixo da imagem igual eventos realizados */}
        <div className="p-3">
          <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1">
            {event.title}
          </h3>
          {event.location && (
            <div className="flex items-center text-slate-500 text-xs mb-2">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="bg-emerald-500 text-white text-center py-2 px-4 rounded-lg font-medium text-xs hover:bg-emerald-600 transition-colors duration-300">
            Aceder Guest List
          </div>
        </div>
      </div>
    </Link>
  )
}
