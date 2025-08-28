'use client'

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { ImageOff, Download, Link } from 'lucide-react';
import { useAuth } from '@/app/app/_providers/auth-provider';
import { toast } from 'sonner';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';

// Updated Evento interface to include location
interface Evento {
    id: string;
    title: string;
    date: string;
    time?: string | null;
    flyer_url: string | null;
    is_published?: boolean;
    location?: string | null;
}

interface EventCardPromotorProps {
    event: Evento;
    isPastEvent?: boolean;
}

export default function EventCardPromotor({ event, isPastEvent }: EventCardPromotorProps) {
    const supabase = createClient();
    const { user } = useAuth();

    // State for statistics
    const [guestStats, setGuestStats] = useState({
        total: 0,
        validated: 0
    });
    const [loadingStats, setLoadingStats] = useState(true);

    // State for the promotional material modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // State for promotion link
    const [promoLink, setPromoLink] = useState<string>('');
    const [loadingPromoLink, setLoadingPromoLink] = useState(true);

    // Fetch guest statistics
    useEffect(() => {
        if (user?.id) {
            fetchGuestStats();
        }
    }, [event.id, user?.id]);

    // Fetch promotion link data
    useEffect(() => {
        if (user && event.id) {
            fetchPromoterAndEventSlugs();
        }
    }, [user, event.id]);

    const fetchGuestStats = async () => {
        try {
            const { data, error } = await supabase
                .from('guests')
                .select('id, check_in_time')
                .eq('event_id', event.id)
                .eq('promoter_id', user?.id);

            if (error) {
                console.error(`[EventCard] Erro ao buscar stats para ${event.title}:`, error);
                return;
            }

            const total = data?.length || 0;
            const validated = data?.filter(guest => guest.check_in_time).length || 0;

            setGuestStats({ total, validated });
        } catch (error) {
            console.error(`[EventCard] Erro fatal ao buscar stats para ${event.title}:`, error);
        } finally {
            setLoadingStats(false);
        }
    };

    // ✅ FUNÇÃO UTILITÁRIA: Extrair slug com fallback (Complexidade: 1)
    const extractSlugWithFallback = (result: any, fallback: string): string => {
        return result?.data?.slug ?? fallback;
    };

    // ✅ FUNÇÃO UTILITÁRIA: Construir link promocional (Complexidade: 1)
    const buildPromoLink = (promoterSlug: string, eventSlug: string): string => {
        return `${window.location.origin}/promotor/${promoterSlug}/${eventSlug}`;
    };

    // ✅ FUNÇÃO UTILITÁRIA: Processar resultado dos slugs (Complexidade: 2)
    const processSlugResults = (promoterResult: any, eventResult: any) => {
        const promoterSlug = extractSlugWithFallback(promoterResult, user?.id || '');
        const eventSlug = extractSlugWithFallback(eventResult, event.id);
        const link = buildPromoLink(promoterSlug, eventSlug);
        
        setPromoLink(link);
        console.log(`[EventCard] Link gerado para ${event.title}: ${link}`);
    };

    // ✅ FUNÇÃO PRINCIPAL: Buscar slugs (Complexidade: 3)
    const fetchPromoterAndEventSlugs = async () => {
        try {
            const [promoterResult, eventResult] = await Promise.all([
                supabase.from('profile_slugs').select('slug').eq('profile_id', user?.id).eq('is_active', true).maybeSingle(),
                supabase.from('event_slugs').select('slug').eq('event_id', event.id).eq('is_active', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
            ]);
            processSlugResults(promoterResult, eventResult);
        } catch (error) {
            console.error('Error fetching promotion slugs:', error);
            const fallbackLink = buildPromoLink(user?.id || '', event.id);
            setPromoLink(fallbackLink);
        } finally {
            setLoadingPromoLink(false);
        }
    };

    // Function to fetch promotional images
    const fetchPromotionalImages = async () => {
        setIsLoadingImages(true);
        setModalError(null);
        setSelectedImageUrls([]);

        try {
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

    // Handler to open modal and fetch images
    const handleShowMaterial = () => {
        setIsModalOpen(true);
        fetchPromotionalImages();
    };

    // Handler to copy promotion link
    const copyPromoLink = async () => {
        if (!promoLink) {
            toast.error('Link de promoção não disponível');
            return;
        }

        try {
            await navigator.clipboard.writeText(promoLink);
            toast.success('Link copiado para a área de transferência!');
        } catch (error) {
            console.error('Error copying link:', error);
            toast.error('Erro ao copiar link');
        }
    };

    return (
        <>
            {/* Card com CSS inline do design fornecido */}
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
                                sizes="280px"
                                priority
                                className="object-cover"
                            />
                        ) : (
                            <div className="no-image-fallback">
                                <ImageOff className="h-12 w-12 text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* Apenas ícone de download no canto */}
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
                                {loadingStats ? '...' : guestStats.total}
                            </span>
                            <span className="regular-text">Guests</span>
                        </div>
                        <div className="item">
                            <span className="big-text">
                                {loadingStats ? '...' : guestStats.validated}
                            </span>
                            <span className="regular-text">Validados</span>
                        </div>
                        <div className="item cursor-pointer" onClick={handleShowMaterial}>
                            <Download className="h-4 w-4 mx-auto mb-1 text-black" />
                            <span className="regular-text">Material</span>
                        </div>
                        <div className="item cursor-pointer" onClick={copyPromoLink}>
                            <Link className="h-4 w-4 mx-auto mb-1 text-black" />
                            <span className="regular-text">LINK</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Material Promocional - {event.title}</DialogTitle>
                        <DialogDescription>
                            Clique numa imagem para fazer o download.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        {isLoadingImages ? (
                            <div className="flex justify-center items-center py-10 h-40">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : modalError ? (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Erro</AlertTitle>
                                <AlertDescription>{modalError}</AlertDescription>
                            </Alert>
                        ) : selectedImageUrls.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {selectedImageUrls.map((url, index) => (
                                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                                        <a
                                            href={url}
                                            download={`material_${event.title?.replace(/\s+/g, '_')}_${index + 1}.png`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Image
                                                src={url}
                                                alt={`Material promocional ${index + 1}`}
                                                fill
                                                className="object-contain cursor-pointer"
                                            />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-muted/50 rounded-md">
                                <p className="text-muted-foreground">Nenhum material promocional encontrado.</p>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="mt-6">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Fechar</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx>{`
                        .event-card-modern {
          width: 280px;
          border-radius: 20px;
          background: white;
          border: 1px solid #000;
          padding: 5px;
          overflow: hidden;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 4px 12px 0px;
          flex-shrink: 0;
        }

                        .top-section {
          height: 180px;
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

        /* Mobile optimization */
        @media (max-width: 640px) {
          .event-card-modern {
            width: 300px;
            margin: 0 auto;
          }
          
          .top-section {
            height: 200px;
          }
          
          .title {
            font-size: 18px;
          }
          
          .big-text {
            font-size: 14px;
          }
          
          .regular-text {
            font-size: 8px;
          }
        }
            `}</style>
        </>
    );
}