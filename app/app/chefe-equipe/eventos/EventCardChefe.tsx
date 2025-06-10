'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, Link, Users, ImageOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/app/_providers/auth-provider';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

interface Event {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  location?: string | null;
  organization_id: string;
  flyer_url?: string | null;
  is_active?: boolean | null;
  is_published?: boolean | null;
}

interface EventCardChefeProps {
  event: Event;
  isPastEvent: boolean;
  teamId: string;
}

interface TeamStats {
  total: number;
  validated: number;
}

export default function EventCardChefe({ event, isPastEvent, teamId }: EventCardChefeProps) {
  const { user } = useAuth();
  
  // State for team statistics
  const [teamStats, setTeamStats] = useState<TeamStats>({
    total: 0,
    validated: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // State for promotional material modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // State for team details modal - versão simplificada
  const [isTeamDetailsOpen, setIsTeamDetailsOpen] = useState(false);
  const [teamDetails, setTeamDetails] = useState<{
    promoters: Array<{
      id: string;
      name: string;
      total_guests: number;
      validated_guests: number;
    }>;
  }>({ promoters: [] });
  const [loadingTeamDetails, setLoadingTeamDetails] = useState(false);

  // Fetch team statistics for this event
  useEffect(() => {
    if (teamId && event.id) {
      fetchTeamStats();
    }
  }, [event.id, teamId]);

  const fetchTeamStats = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('guests')
        .select('id, check_in_time')
        .eq('event_id', event.id)
        .eq('team_id', teamId);

      if (error) {
        console.error('Erro ao buscar estatísticas da equipa:', error);
        return;
      }

      const total = data?.length || 0;
      const validated = data?.filter(guest => guest.check_in_time).length || 0;

      setTeamStats({ total, validated });
    } catch (error) {
      console.error('Erro ao carregar estatísticas da equipa:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Versão simplificada: buscar apenas dados dos promotores
  const fetchTeamDetails = async () => {
    setLoadingTeamDetails(true);
    
    try {
      const supabase = createClient();
      
      // Buscar guests da equipa para este evento
      const { data: eventGuests, error: guestsError } = await supabase
        .from('guests')
        .select('id, check_in_time, promoter_id')
        .eq('event_id', event.id)
        .eq('team_id', teamId);

      if (guestsError) {
        throw new Error('Não foi possível carregar dados do evento');
      }

      // Buscar perfis dos promotores
      const promoterIds = [...new Set(eventGuests?.map(g => g.promoter_id).filter(Boolean) || [])];
      let promoterProfiles = {};
      
      if (promoterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', promoterIds);
          
        if (!profilesError && profiles) {
          promoterProfiles = profiles.reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }
      }

      // Agrupar por promotor
      const promoterMap = {};
      (eventGuests || []).forEach(guest => {
        const pid = guest.promoter_id;
        if (!promoterMap[pid]) {
          const profile = promoterProfiles[pid];
          promoterMap[pid] = {
            id: pid,
            name: profile?.first_name && profile?.last_name
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : 'Promotor',
            total_guests: 0,
            validated_guests: 0
          };
        }
        promoterMap[pid].total_guests++;
        if (guest.check_in_time) {
          promoterMap[pid].validated_guests++;
        }
      });

      const promoters = Object.values(promoterMap);
      setTeamDetails({ promoters });
      
    } catch (error) {
      console.error('Erro ao carregar detalhes da equipa:', error);
      toast.error('Erro ao carregar detalhes da equipa');
    } finally {
      setLoadingTeamDetails(false);
    }
  };

  const fetchPromotionalImages = async () => {
    setIsLoadingImages(true);
    setModalError(null);

    try {
      const supabase = createClient();
      const { data, error: imagesError } = await supabase
        .from('promotional_materials')
        .select('image_url')
        .eq('event_id', event.id);

      if (imagesError) {
        throw new Error(`Falha ao carregar imagens promocionais: ${imagesError.message}`);
      }

      const urls = data?.map(item => item.image_url).filter(Boolean) as string[] || [];
      setSelectedImageUrls(urls);

    } catch (err: any) {
      setModalError(err.message || "Ocorreu um erro ao buscar as imagens.");
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleShowMaterial = () => {
    setIsModalOpen(true);
    fetchPromotionalImages();
  };

  const copyTeamLink = async () => {
    const teamLink = `${window.location.origin}/promo/${event.id}/${user?.id}/${teamId}`;
    
    try {
      await navigator.clipboard.writeText(teamLink);
      toast.success('Link da equipa copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao copiar link da equipa:', error);
      toast.error('Erro ao copiar link');
    }
  };

  const handleShowTeamDetails = () => {
    setIsTeamDetailsOpen(true);
    fetchTeamDetails();
  };

  return (
    <>
      {/* Card com CSS inline do design exato do EventCardPromotor */}
      <div className="event-card-modern">
        <div className="top-section">
          {/* Imagem do evento */}
          <div className="event-image-container">
            {isPastEvent && (
              <div className="past-event-overlay">
                <span>REALIZADO</span>
              </div>
            )}
            {event.flyer_url ? (
              <Image
                src={event.flyer_url}
                alt={event.title}
                fill
                sizes="230px"
                priority
                className="object-cover"
              />
            ) : (
              <div className="no-image-fallback">
                <ImageOff className="h-12 w-12 text-gray-400" />
              </div>
            )}
          </div>

          {/* Ícone de download no canto */}
          <div className="download-icon">
            <Download 
              className="svg cursor-pointer" 
              onClick={handleShowMaterial}
            />
          </div>
        </div>

        <div className="bottom-section">
          <span className="title">{event.title}</span>
          
          <div className="row">
            <div className="item">
              <span className="big-text">
                {loadingStats ? '...' : teamStats.total}
              </span>
              <span className="regular-text">Convidados</span>
            </div>
            <div className="item">
              <span className="big-text">
                {loadingStats ? '...' : teamStats.validated}
              </span>
              <span className="regular-text">Validados</span>
            </div>
            <div className="item cursor-pointer" onClick={handleShowMaterial}>
              <Download className="h-4 w-4 mx-auto mb-1 text-black" />
              <span className="regular-text">Material</span>
            </div>
            <div className="item cursor-pointer" onClick={copyTeamLink}>
              <Link className="h-4 w-4 mx-auto mb-1 text-black" />
              <span className="regular-text">LINK</span>
            </div>
          </div>

          {/* Botão para detalhes da equipa */}
          <div style={{ marginTop: '15px' }}>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={handleShowTeamDetails}
            >
              <Users className="mr-1 h-3 w-3" />
              Ver Detalhes da Equipa
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de Material Promocional */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Material Promocional: {event.title}</DialogTitle>
            <DialogDescription>
              Clique numa imagem para fazer o download.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-grow overflow-y-auto p-1">
            {isLoadingImages ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-3 text-muted-foreground">A carregar imagens...</p>
              </div>
            ) : modalError ? (
              <div className="flex flex-col justify-center items-center h-40 text-destructive">
                <p className="font-semibold">Erro ao carregar</p>
                <p className="text-sm text-center">{modalError}</p>
              </div>
            ) : selectedImageUrls.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedImageUrls.map((imageUrl, index) => (
                  <a
                    key={index}
                    href={imageUrl}
                    download={`material_${event.title?.replace(/\s+/g, '_').toLowerCase() || 'evento'}_${index + 1}.jpg`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Clique para fazer download"
                    className="block relative aspect-square overflow-hidden rounded-md border hover:opacity-80 transition-opacity"
                  >
                    <Image
                      src={imageUrl}
                      alt={`Material ${index + 1} para ${event.title || 'evento'}`}
                      fill
                      style={{ objectFit: 'cover', cursor: 'pointer' }}
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
                <ImageOff className="h-10 w-10 mb-3" />
                <p>Nenhum material promocional encontrado para este evento.</p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-auto pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Simplificado de Detalhes da Equipa */}
      <Dialog open={isTeamDetailsOpen} onOpenChange={setIsTeamDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
              📊 Detalhes da Equipa - {event.title}
            </DialogTitle>
          </DialogHeader>
          
          {loadingTeamDetails ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">A carregar dados da equipa...</span>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {/* Resumo Geral */}
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold text-lg mb-3">📈 Resumo da Performance</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{teamStats.total}</div>
                    <div className="text-xs text-gray-500">Total Convidados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{teamStats.validated}</div>
                    <div className="text-xs text-gray-500">Validados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{teamDetails.promoters.length}</div>
                    <div className="text-xs text-gray-500">Promotores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {teamStats.total > 0 ? Math.round((teamStats.validated / teamStats.total) * 100) : 0}%
                    </div>
                    <div className="text-xs text-gray-500">Taxa Validação</div>
                  </div>
                </div>
              </div>

              {/* Lista de Promotores */}
              <div>
                <h3 className="font-semibold text-lg mb-3">👥 Promotores da Equipa</h3>
                {teamDetails.promoters.length > 0 ? (
                  <div className="grid gap-3">
                    {teamDetails.promoters.map((promoter) => (
                      <div 
                        key={promoter.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{promoter.name}</h4>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-blue-600 font-medium">
                              {promoter.total_guests} convidados
                            </span>
                            <span className="text-green-600 font-medium">
                              {promoter.validated_guests} validados
                            </span>
                            <span className="text-gray-500">
                              ({promoter.total_guests > 0 ? Math.round((promoter.validated_guests / promoter.total_guests) * 100) : 0}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum promotor encontrado nesta equipa.</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSS inline EXATO do EventCardPromotor */}
      <style jsx>{`
        .event-card-modern {
          width: 230px;
          border-radius: 20px;
          background: white;
          border: 1px solid #000;
          padding: 5px;
          overflow: hidden;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px 0px;
        }

        .top-section {
          height: 150px;
          border-radius: 15px;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        .event-image-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .no-image-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(45deg, #8ed500 0%, #8ed500 100%);
        }

        .past-event-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          color: white;
          font-size: 12px;
          font-weight: bold;
          letter-spacing: 2px;
        }

        .download-icon {
          position: absolute;
          top: 0;
          right: 0;
          padding: 8px;
          z-index: 30;
        }

        .svg {
          height: 16px;
          width: 16px;
          fill: #000;
          background: rgba(255, 255, 255, 0.9);
          padding: 4px;
          border-radius: 4px;
          transition: all 0.3s ease;
        }

        .svg:hover {
          fill: #000;
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }

        .bottom-section {
          margin-top: 15px;
          padding: 10px 5px;
        }

        .title {
          display: block;
          font-size: 17px;
          font-weight: bolder;
          color: #000;
          text-align: center;
          letter-spacing: 2px;
          line-height: 1.2;
          margin-bottom: 10px;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }

        .item {
          flex: 1;
          text-align: center;
          padding: 3px;
          color: #000;
          transition: opacity 0.3s ease;
        }

        .item:hover {
          opacity: 0.7;
        }

        .big-text {
          font-size: 12px;
          display: block;
          font-weight: bold;
        }

        .regular-text {
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .item:nth-child(2) {
          border-left: 1px solid rgba(0, 0, 0, 0.2);
        }

        .item:nth-child(3) {
          border-left: 1px solid rgba(0, 0, 0, 0.2);
        }

        .item:nth-child(4) {
          border-left: 1px solid rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </>
  );
}