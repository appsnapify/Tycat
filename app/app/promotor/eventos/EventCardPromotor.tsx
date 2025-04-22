'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { CalendarIcon, Download as DownloadIcon, ImageOff, Loader2, AlertCircle, MapPinIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
    DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Updated Evento interface to include location
interface Evento {
    id: string;
    title: string;
    date: string;
    time?: string | null;
    flyer_url: string | null;
    is_published?: boolean;
    location?: string | null; // Added location
    // Note: end_date/end_time are fetched by page.tsx but not needed directly in card display
}

// Updated date/time formatting logic
function formatDisplayDateTime(dateStr: string, timeStr: string | null | undefined): string {
    if (!dateStr) return 'Data inválida';

    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return 'Data inválida';

    const hasValidTime = timeStr && timeStr !== '00:00:00' && timeStr.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/);
    
    const dateTimeToFormat = hasValidTime ? new Date(`${dateStr}T${timeStr}`) : dateObj;
    if (isNaN(dateTimeToFormat.getTime())) return 'Data inválida'; // Double check combined date

    const formatString = hasValidTime ? "dd 'de' MMMM 'de' yyyy 'às' HH:mm" : "dd 'de' MMMM 'de' yyyy";

    try {
        return format(dateTimeToFormat, formatString, { locale: ptBR });
    } catch (e) {
        console.error("Error formatting date:", e);
        return 'Data inválida';
    }
}

interface EventCardPromotorProps {
    event: Evento;
    isPastEvent?: boolean;
}

export default function EventCardPromotor({ event, isPastEvent }: EventCardPromotorProps) {
    const displayDateTime = formatDisplayDateTime(event.date, event.time);
    const supabase = createClientComponentClient();

    // State for the promotional material modal (copied from chefe-equipe logic)
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImageUrls, setSelectedImageUrls] = useState<string[]>([]);
    const [selectedImageTitle, setSelectedImageTitle] = useState<string | null>(null);
    const [isLoadingImages, setIsLoadingImages] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Function to fetch promotional images (copied from chefe-equipe logic)
    const fetchPromotionalImages = async (eventId: string) => {
        setIsLoadingImages(true);
        setModalError(null);
        setSelectedImageUrls([]);

        console.log("[EventCardPromotor] Fetching images for event ID:", eventId);

        try {
            const { data, error: imagesError } = await supabase
                .from('promotional_materials') // Assuming this table exists
                .select('image_url')
                .eq('event_id', eventId);

            if (imagesError) {
                console.error("[EventCardPromotor] Modal Error:", imagesError);
                throw new Error(`Falha ao carregar imagens promocionais: ${imagesError.message}`);
            }

            console.log("[EventCardPromotor] Fetched image data:", data);
            const urls = data?.map(item => item.image_url).filter(Boolean) as string[] || [];
            console.log("[EventCardPromotor] Extracted URLs:", urls);
            setSelectedImageUrls(urls);

        } catch (err: any) {
            console.error("[EventCardPromotor] Modal Error:", err);
            setModalError(err.message || "Ocorreu um erro ao buscar as imagens.");
        } finally {
            setIsLoadingImages(false);
        }
    };

    // Handler to open modal and fetch images (copied from chefe-equipe logic)
    const handleShowMaterial = () => {
        console.log("[EventCardPromotor] handleShowMaterial called with eventId:", event.id);
        setSelectedImageTitle(event.title || 'evento');
        setIsModalOpen(true);
        fetchPromotionalImages(event.id);
    };

    // Define the main card/dialog content once
    const cardContent = (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Card className={`overflow-hidden transition-shadow hover:shadow-md`}>
                <CardHeader className="p-0 relative">
                    <div className="aspect-video overflow-hidden relative w-full bg-muted">
                        {isPastEvent && (
                            <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 pt-4">
                                <p className="text-center text-xs font-semibold uppercase tracking-wider text-white">
                                    Evento Realizado
                                </p>
                            </div>
                        )}
                        {event.flyer_url ? (
                            <Image
                                src={event.flyer_url}
                                alt={`Flyer do evento ${event.title}`}
                                layout="fill"
                                objectFit="cover"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                                <ImageOff className="h-12 w-12 text-gray-400" />
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="p-4 space-y-1.5">
                    <CardTitle className="text-base font-semibold line-clamp-2">
                        {event.title}
                    </CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                        <CalendarIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
                        <span>{displayDateTime}</span>
                    </div>
                    {event.location && (
                        <div className="flex items-center text-xs text-muted-foreground">
                            <MapPinIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
                            <span className="line-clamp-1">{event.location}</span>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="px-4 pb-3 pt-3">
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full" onClick={handleShowMaterial}>
                            <DownloadIcon className="mr-1.5 h-4 w-4" />
                            Material Promocional
                        </Button>
                    </DialogTrigger>
                </CardFooter>
            </Card>

            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Material Promocional - {selectedImageTitle}</DialogTitle>
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
                                        download={`material_${selectedImageTitle?.replace(/\s+/g, '_')}_${index + 1}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Image
                                            src={url}
                                            alt={`Material promocional ${index + 1}`}
                                            layout="fill"
                                            objectFit="contain"
                                            className="cursor-pointer"
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
    );

    // Render the content, wrapping conditionally
    return isPastEvent 
            ? <div className="relative group opacity-70">{cardContent}</div> 
            : cardContent;
} 