import Image from 'next/image'
import { Calendar } from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  date: string
  flyer_url: string
}

interface PastEventsSectionProps {
  events: Event[]
  organizationSlug: string
}

// Função para formatar data
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-PT', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })
}

export default function PastEventsSection({ events }: PastEventsSectionProps) {
  if (events.length === 0) return null

  return (
    <section className="py-6 sm:py-8 bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Título da seção - MCP 21st */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-3">
            Eventos Realizados
          </h2>
          <div className="w-16 h-0.5 bg-gradient-to-r from-slate-400 to-slate-600 mx-auto rounded-full"></div>
        </div>

        {/* Grid de eventos passados - MCP 21st */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.map((event) => (
            <div key={event.id} className="group">
              <div className="relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 bg-white border border-slate-100">
                {/* Imagem do evento - altura fixa igual à terceira imagem */}
                <div className="relative h-48">
                  {event.flyer_url ? (
                    <Image 
                      src={event.flyer_url}
                      alt={event.title}
                      fill
                      className="object-cover object-center grayscale-[50%] group-hover:grayscale-0 transition-all duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-all duration-500"></div>
                </div>
                
                {/* Informações do evento - compactas */}
                <div className="p-3">
                  <h3 className="font-semibold text-slate-800 text-sm mb-1 line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    {formatDate(event.date)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
