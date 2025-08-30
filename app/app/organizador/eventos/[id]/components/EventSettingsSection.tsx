'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, MapPinIcon, Clock, MapPin } from 'lucide-react';

interface EventData {
  id: string;
  title: string;
  description?: string;
  flyer_url?: string;
  date: string;
  time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  guest_list_open_datetime?: string;
  guest_list_close_datetime?: string;
}

interface EventSettingsSectionProps {
  event: EventData;
}

export default function EventSettingsSection({ event }: EventSettingsSectionProps) {
  return (
    <div className="space-y-6">
      {/* Informações Básicas do Evento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Informações do Evento
          </CardTitle>
          <CardDescription>Detalhes básicos e configurações do evento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium text-sm text-gray-500 mb-1">Nome do Evento</h3>
            <p className="text-sm text-gray-700">{event.title}</p>
          </div>
          
          {event.description && (
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Descrição</h3>
              <p className="text-sm text-gray-700">{event.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1 flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                Data de Início
              </h3>
              <p className="text-sm text-gray-700">
                {new Date(event.date).toLocaleDateString('pt-BR')}
                {event.time && ` às ${event.time}`}
              </p>
            </div>

            {event.end_date && (
              <div>
                <h3 className="font-medium text-sm text-gray-500 mb-1 flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Data de Fim
                </h3>
                <p className="text-sm text-gray-700">
                  {new Date(event.end_date).toLocaleDateString('pt-BR')}
                  {event.end_time && ` às ${event.end_time}`}
                </p>
              </div>
            )}
          </div>

          {event.location && (
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1 flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                Localização
              </h3>
              <p className="text-sm text-gray-700">{event.location}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configurações da Guest List */}
      {(event.guest_list_open_datetime || event.guest_list_close_datetime) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-semibold text-lg text-gray-900">
              Configurações da Guest List
            </CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Datas e horários para registro de convidados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Abertura das Inscrições</h3>
              <p className="text-sm text-gray-700">
                {event.guest_list_open_datetime 
                  ? new Date(event.guest_list_open_datetime).toLocaleString('pt-BR') 
                  : 'Não definido'
                }
              </p>
            </div>
            <div>
              <h3 className="font-medium text-sm text-gray-500 mb-1">Fechamento das Inscrições</h3>
              <p className="text-sm text-gray-700">
                {event.guest_list_close_datetime 
                  ? new Date(event.guest_list_close_datetime).toLocaleString('pt-BR')
                  : 'Não definido'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

