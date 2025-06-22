"use client"

import NextImage from 'next/image';
import { CalendarIcon, Clock, MapPin, AlertTriangle, XCircle, ClockIcon, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { GuestRequestClient } from '@/components/promoter/GuestRequestClientButton';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useState, useEffect, useRef } from 'react';

interface PromoterGuestListContentProps {
  event: {
    title: string;
    description?: string;
    date: string;
    time: string | null;
    location: string | null;
    flyer_url: string | null;
    org_name?: string; // Nome da organização
    organizations?: { name: string }[] | { name: string }; // Dados da organização via JOIN
  };
  params: string[];
  hasAssociation?: boolean;
  guestListStatus: {
    isOpen: boolean;
    status: 'BEFORE_OPENING' | 'OPEN' | 'CLOSED' | 'NO_SCHEDULE';
    message: string;
    openDateTime?: string;
    closeDateTime?: string;
  };
}

export default function PromoterGuestListContent({ event, params, hasAssociation = false, guestListStatus }: PromoterGuestListContentProps) {
  // Estados para extração de cor dominante - sem cor inicial para evitar flash
  const [dominantColor, setDominantColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Formatar data e hora do evento
  const eventDate = event.date ? format(new Date(event.date), 'PPP', { locale: pt }) : 'Data não definida';
  const eventTime = event.time || 'Horário não definido';

  // Obter nome da organização com fallbacks (objeto ou array)
  const getOrganizationName = () => {
    // Primeiro, tentar org_name processado
    if (event.org_name) return event.org_name;
    
    // Se organizations for array
    if (Array.isArray(event.organizations) && event.organizations[0]?.name) {
      return event.organizations[0].name;
    }
    
    // Se organizations for objeto direto
    if (event.organizations && typeof event.organizations === 'object' && 'name' in event.organizations) {
      return (event.organizations as { name: string }).name;
    }
    
    return 'Organizador';
  };
  
  const organizationName = getOrganizationName();

  // Função para truncar descrição
  const getTruncatedDescription = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Organização processada

  // Extrair cor dominante da imagem
  useEffect(() => {
    if (!event.flyer_url) return;

    const extractDominantColor = (url: string) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      // Aplicar cor imediatamente quando a imagem começar a carregar
      img.onloadstart = () => {
        // Imagem iniciando carregamento
      };
      
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyzeSize = 50;
        canvas.width = analyzeSize;
        canvas.height = analyzeSize;
        
        ctx.drawImage(img, 0, 0, analyzeSize, analyzeSize);
        const imageData = ctx.getImageData(0, 0, analyzeSize, analyzeSize);
        const data = imageData.data;

        // Coletar todas as cores com suas frequências
        const colorMap = new Map<string, {count: number, r: number, g: number, b: number, saturation: number, brightness: number}>();

        for (let i = 0; i < data.length; i += 4) {
          const red = data[i];
          const green = data[i + 1];
          const blue = data[i + 2];
          
          // Quantizar cores para reduzir variações mínimas
          const qR = Math.round(red / 8) * 8;
          const qG = Math.round(green / 8) * 8;
          const qB = Math.round(blue / 8) * 8;
          
          const colorKey = `${qR},${qG},${qB}`;
          
          // Calcular propriedades da cor
          const max = Math.max(qR, qG, qB);
          const min = Math.min(qR, qG, qB);
          const saturation = max === 0 ? 0 : (max - min) / max;
          const brightness = (qR + qG + qB) / 3;
          
          if (colorMap.has(colorKey)) {
            colorMap.get(colorKey)!.count++;
          } else {
            colorMap.set(colorKey, {
              count: 1,
              r: qR,
              g: qG,
              b: qB,
              saturation,
              brightness
            });
          }
        }

        // Encontrar a cor mais "ativa" - combinação de frequência, saturação e contraste
        let bestColor = null;
        let bestScore = 0;

        for (const [key, color] of colorMap) {
          // Filtrar cores muito escuras ou muito claras
          if (color.brightness < 20 || color.brightness > 235) continue;
          
          // Calcular score híbrido
          const frequencyScore = color.count / (analyzeSize * analyzeSize); // 0-1
          const saturationScore = Math.pow(color.saturation, 1.5); // Priorizar saturação
          const brightnessScore = Math.min(color.brightness / 128, 2 - color.brightness / 128); // Preferir brilho médio
          const contrastScore = color.saturation > 0.4 ? 2 : 1; // Boost para cores muito saturadas
          
          const totalScore = frequencyScore * saturationScore * brightnessScore * contrastScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestColor = color;
          }
        }

        // Fallback: se não encontrar cor ativa, usar a mais frequente que não seja preto/branco
        if (!bestColor) {
          let maxCount = 0;
          for (const [key, color] of colorMap) {
            if (color.brightness > 30 && color.brightness < 225 && color.count > maxCount) {
              maxCount = color.count;
              bestColor = color;
            }
          }
        }

        if (bestColor) {
          // Aplicar cor dominante extraída
          setDominantColor({
            r: Math.min(bestColor.r, 255), // Corrigir valores RGB máximos
            g: Math.min(bestColor.g, 255),
            b: Math.min(bestColor.b, 255)
          });
        }
      };
      img.src = url;
    };

    extractDominantColor(event.flyer_url);
  }, [event.flyer_url]);

  // Gerar estilos consistentes baseados na cor dominante
  const generateBackgroundStyle = () => {
    if (!dominantColor) {
      return { background: 'rgba(250, 250, 250, 1)' };
    }
    
    const { r, g, b } = dominantColor;
    return {
      background: `linear-gradient(180deg, 
        rgba(${r},${g},${b},0.4) 0%,
        rgba(${r},${g},${b},0.35) 15%,
        rgba(${r},${g},${b},0.25) 30%,
        rgba(${r},${g},${b},0.15) 45%,
        rgba(${r},${g},${b},0.05) 50%,
        rgba(255,255,255,1) 55%,
        rgba(255,255,255,1) 100%
      )`,
    };
  };

  // Header agora faz parte do gradiente principal - sem cor separada

  // Gerar estilo para cards/elementos - mesma cor base
  const generateCardStyle = () => {
    if (!dominantColor) {
      return {};
    }
    
    const { r, g, b } = dominantColor;
    return {
      backgroundColor: `rgba(${r},${g},${b},0.05)`,
      borderColor: `rgba(${r},${g},${b},0.2)`,
    };
  };

  // Gerar estilo para botões - cor dinâmica do evento
  const generateButtonStyle = () => {
    if (!dominantColor) {
      return {
        backgroundColor: '#8B5A3C', // cor padrão marrom
        color: 'white'
      };
    }
    
    const { r, g, b } = dominantColor;
    // Determinar se a cor é clara ou escura para ajustar o texto
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    const textColor = brightness > 128 ? '#000000' : '#FFFFFF';
    
    return {
      backgroundColor: `rgba(${r},${g},${b},0.9)`,
      color: textColor,
      border: `1px solid rgba(${r},${g},${b},1)`,
    };
  };

  return (
    <div className="min-h-screen" style={generateBackgroundStyle()}>
      {/* Canvas oculto para análise de cor */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Header TYCAT - transparente para integrar com gradiente */}
      <div className="backdrop-blur-sm">
        <div className="px-6 py-6">
          <h1 className="text-xl font-bold text-gray-900 drop-shadow-sm">TYCAT</h1>
        </div>
      </div>
      
      {/* Aviso se não há associação - integrado no gradiente */}
      {!hasAssociation && (
        <div className="backdrop-blur-sm border-b border-orange-200/50 px-6 py-3">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Este link pode não estar ativo ou ter funcionalidades limitadas.</span>
          </div>
        </div>
      )}

      {/* Layout principal - EXATAMENTE COMO REFERÊNCIA SNAP */}
      <main className="max-w-7xl mx-auto px-4 pb-12 pt-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Event Image - ESTILO EXATO DA REFERÊNCIA */}
          {event.flyer_url && (
            <div className="order-1 md:order-2 relative rounded-lg">
              <div 
                className="w-full relative rounded-lg overflow-hidden"
                style={{
                  aspectRatio: '16/9',
                  maxWidth: '100%',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                  border: dominantColor ? `1px solid rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.2)` : '1px solid rgba(0,0,0,0.1)',
                  backgroundColor: dominantColor ? `rgba(${dominantColor.r},${dominantColor.g},${dominantColor.b},0.05)` : 'rgba(255,255,255,0.9)'
                }}
              >
                <NextImage
                  src={event.flyer_url}
                  fill
                  className="object-cover rounded-lg"
                  alt={event.title || 'Flyer do evento'}
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center'
                  }}
                />
              </div>
            </div>
          )}

          {/* Event Details - TIPOGRAFIA EXATA */}
          <div className="order-2 md:order-1 space-y-6">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              {event.title.toUpperCase()}
            </h1>
            
            <p className="text-gray-600">Por <span className="text-gray-900">{organizationName}</span></p>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-gray-600">
                <CalendarIcon className="w-5 h-5 flex-shrink-0" />
                <span className="text-gray-900">{eventDate}</span>
                {event.time && (
                  <>
                    <span>às</span>
                    <span className="text-gray-900">{eventTime}</span>
                  </>
                )}
              </div>

              {event.location && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Descrição do evento */}
            {event.description && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-700" />
                  <h3 className="text-lg font-semibold text-gray-900">Descrição</h3>
                </div>
                <div className="text-gray-600 leading-relaxed pl-7">
                  <p>
                    {isDescriptionExpanded 
                      ? event.description 
                      : getTruncatedDescription(event.description)
                    }
                  </p>
                  {event.description.length > 150 && (
                    <button
                      onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      className="mt-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
                    >
                      {isDescriptionExpanded ? 'Ver menos' : 'Ver mais'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* SEÇÃO GUEST LIST - fundo branco fixo */}
      <div 
        className="max-w-2xl mx-auto px-4 pb-8 rounded-lg bg-white"
      >
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center pt-8">
          Aceder guest list
        </h2>
        
        {guestListStatus.isOpen ? (
          <GuestRequestClient
            eventId={params[0]}
            promoterId={params[1]}
            teamId={params[2]}
            buttonStyle={generateButtonStyle()}
          />
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-6">
              {guestListStatus.status === 'CLOSED' && <XCircle className="h-10 w-10 text-red-500" />}
              {guestListStatus.status === 'BEFORE_OPENING' && <ClockIcon className="h-10 w-10 text-orange-500" />}
              {guestListStatus.status === 'NO_SCHEDULE' && <AlertTriangle className="h-10 w-10 text-yellow-500" />}
              <h3 className="text-2xl font-bold text-gray-900">
                {guestListStatus.status === 'CLOSED' && 'Guest List Fechada'}
                {guestListStatus.status === 'BEFORE_OPENING' && 'Guest List em Breve'}
                {guestListStatus.status === 'NO_SCHEDULE' && 'Guest List Indisponível'}
              </h3>
            </div>
            
            <div className={`p-6 rounded-lg mb-6 ${
              guestListStatus.status === 'CLOSED' ? 'bg-red-50 border border-red-200' :
              guestListStatus.status === 'BEFORE_OPENING' ? 'bg-orange-50 border border-orange-200' :
              'bg-yellow-50 border border-yellow-200'
            }`}>
              <p className={`text-lg ${
                guestListStatus.status === 'CLOSED' ? 'text-red-700' :
                guestListStatus.status === 'BEFORE_OPENING' ? 'text-orange-700' :
                'text-yellow-700'
              }`}>
                {guestListStatus.message}
              </p>
            </div>
            
            {guestListStatus.status === 'BEFORE_OPENING' && (
              <div className="text-base text-gray-500">
                <p>Volte quando a guest list abrir para garantir o seu lugar!</p>
                <Button 
                  disabled 
                  className="w-full mt-4 opacity-50"
                  style={generateButtonStyle()}
                >
                  Aguardando Abertura
                </Button>
              </div>
            )}
            
            {guestListStatus.status === 'CLOSED' && (
              <div className="text-base text-gray-500">
                <p>O período de inscrição para este evento já terminou.</p>
                <Button 
                  disabled 
                  className="w-full mt-4 opacity-50"
                  style={generateButtonStyle()}
                >
                  Guest List Encerrada
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Canvas oculto para extração de cor dominante */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
} 