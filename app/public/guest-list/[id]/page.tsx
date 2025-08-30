'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { createClient } from '@supabase/supabase-js'

// Cria cliente do Supabase (não autenticado)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GuestListEvent {
  id: string
  title: string
  description: string
  location: string
  date: string
  time: string
  flyer_url: string
  organization_id: string
}

interface FormData {
  name: string
  phone: string
}

export default function GuestListPage() {
  const { id } = useParams()
  const [event, setEvent] = useState<GuestListEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<FormData>({ name: '', phone: '' })
  const [submitting, setSubmitting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true)
        const eventId = Array.isArray(id) ? id[0] : id as string
        
        // Buscar o evento do Supabase
        const { data, error } = await supabase
          .from('guest_list_events')
          .select('*')
          .eq('id', eventId)
          .single()
        
        if (error || !data) {
          console.error('Erro ao buscar evento:', error)
          setError('Evento não encontrado. Verifique o link e tente novamente.')
          return
        }
        
        setEvent(data as GuestListEvent)
      } catch (err) {
        console.error('Erro ao buscar evento:', err)
        setError('Não foi possível carregar o evento. Por favor, tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvent()
  }, [id])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ✅ FUNÇÕES AUXILIARES (Complexidade: ≤3 pontos cada)
  const validateFormData = () => {
    return formData.name && formData.phone;
  };

  const showValidationError = () => {
    toast({
      title: "Campos incompletos",
      description: "Por favor, preencha todos os campos",
      variant: "destructive"
    });
  };

  const buildRequestPayload = () => ({
    eventId: event?.id ?? null,
    name: formData.name,
    phone: formData.phone
  });

  const sendGuestRegistration = async (payload: any) => {
    const response = await fetch('/api/guests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error ?? 'Erro ao registrar');
    }
    
    return data;
  };

  const showSuccessMessage = () => {
    toast({
      title: "Registro confirmado!",
      description: "Você está na guest list. Apresente o QR code na entrada do evento.",
    });
  };

  const getErrorMessage = (error: unknown): string => {
    return error instanceof Error ? error.message : "Ocorreu um erro ao processar seu registro. Tente novamente.";
  };

  const showErrorMessage = (error: unknown) => {
    toast({
      title: "Erro ao registrar",
      description: getErrorMessage(error),
      variant: "destructive"
    });
  };

  // ✅ FUNÇÃO PRINCIPAL SIMPLIFICADA (Complexidade: 4 pontos)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateFormData()) {                                // +1
      showValidationError();
      return;
    }
    
    try {                                                     // +1
      setSubmitting(true);
      
      const payload = buildRequestPayload();
      const data = await sendGuestRegistration(payload);
      
      setQrCode(data.qrCode);
      showSuccessMessage();
    } catch (err) {                                           // +1
      console.error('Erro ao registrar:', err);
      showErrorMessage(err);
    } finally {                                               // +1
      setSubmitting(false);
    }
  };

  // Função para formatação de data
  const formatEventDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd 'de' MMMM 'de' yyyy", { locale: pt })
    } catch (err) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-2">Evento não encontrado</h1>
        <p className="text-gray-600 mb-6">{error || "O evento solicitado não existe ou foi removido."}</p>
        <Button onClick={() => window.history.back()}>Voltar</Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4 pt-8">
        {/* Flyer do evento */}
        <div className="mb-6 rounded-lg overflow-hidden shadow-md">
          <div className="relative w-full h-64">
            <img
              src={event.flyer_url}
              alt={event.title}
              className="object-cover w-full h-full"
            />
          </div>
        </div>
        
        {/* Detalhes do evento */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
          <p className="text-gray-600 mb-4">{event.description}</p>
          
          <div className="space-y-3">
            <div className="flex items-center text-gray-700">
              <Calendar className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            
            <div className="flex items-center text-gray-700">
              <Clock className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{event.time}</span>
            </div>
            
            <div className="flex items-center text-gray-700">
              <MapPin className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>{event.location}</span>
            </div>
          </div>
        </div>
        
        {!qrCode ? (
          /* Formulário de registro */
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Registre-se na Guest List</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Seu Nome</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Digite seu nome completo"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="(00) 00000-0000"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitting}
              >
                {submitting ? 'Processando...' : 'Confirmar Presença'}
              </Button>
            </form>
          </div>
        ) : (
          /* QR Code após confirmação */
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Você está na Guest List!</h2>
            <p className="text-gray-600 mb-6">Apresente este QR code na entrada do evento.</p>
            
            <div className="bg-white p-4 rounded-lg border border-gray-200 inline-block mb-6">
              <img 
                src={qrCode} 
                alt="QR Code" 
                width={200} 
                height={200}
                className="mx-auto"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Nome:</strong> {formData.name}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Telefone:</strong> {formData.phone}
              </p>
            </div>
            
            <div className="mt-6">
              <Button 
                variant="outline" 
                className="mr-2"
                onClick={() => window.print()}
              >
                Salvar / Imprimir
              </Button>
              <Button
                onClick={() => window.location.reload()}
              >
                Novo Registro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 