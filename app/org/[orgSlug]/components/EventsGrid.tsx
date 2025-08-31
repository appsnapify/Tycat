import { Calendar } from 'lucide-react'
import EventCardPublic from './EventCardPublic'

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

interface EventsGridProps {
  events: Event[]
  organizationSlug: string
  title: string
}

export default function EventsGrid({ events, organizationSlug, title }: EventsGridProps) {
  return (
               <section className="py-4 sm:py-6 md:py-8">
             <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        {/* Título da seção - MCP 21st */}
                       <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mb-3">
            {title}
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-emerald-500 to-violet-500 mx-auto rounded-full"></div>
        </div>

        {/* Grid de eventos */}
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="relative">
              <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Calendar className="h-8 w-8 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-3">Nenhum evento disponível</h3>
            <p className="text-slate-600 mb-6">Esta organização ainda não tem eventos publicados.</p>
            <div className="bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-xl p-4 max-w-md mx-auto">
              <div className="text-slate-600 text-sm space-y-2">
                <p className="flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>
                  Os eventos aparecerão aqui quando forem publicados
                </p>
                <p className="flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-violet-500 rounded-full mr-2"></span>
                  Volte em breve para ver as novidades
                </p>
              </div>
            </div>
          </div>
        ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {events.map((event, index) => (
              <EventCardPublic
                key={event.id}
                event={event}
                organizationSlug={organizationSlug}
                priority={index < 4}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
