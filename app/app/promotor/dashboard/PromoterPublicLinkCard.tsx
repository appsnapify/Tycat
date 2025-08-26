'use client';

import React, { useState, useEffect } from 'react';
import { Share2, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PromoterPublicLinkCardProps {
    userId: string;
}

export default function PromoterPublicLinkCard({ userId }: PromoterPublicLinkCardProps) {
    const [loading, setLoading] = useState(true);
    const [publicLink, setPublicLink] = useState<string>('');

    useEffect(() => {
        generatePublicLink();
    }, []);

    const generatePublicLink = async () => {
        try {
            // Buscar slug do promotor
            const response = await fetch('/api/promotor/slug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            
            if (response.ok) {
                const data = await response.json();
                const slug = data.slug || userId; // Fallback para UUID se não houver slug
                const link = `${window.location.origin}/promotor/${slug}`;
                setPublicLink(link);
            } else {
                // Fallback para UUID se API falhar
                const link = `${window.location.origin}/promotor/${userId}`;
                setPublicLink(link);
            }
        } catch (error) {
            // Fallback para UUID em caso de erro
            const link = `${window.location.origin}/promotor/${userId}`;
            setPublicLink(link);
        }
        setLoading(false);
    };

    const copyPublicLink = async () => {
        if (!publicLink) {
            toast.error('Link não disponível');
            return;
        }

        try {
            await navigator.clipboard.writeText(publicLink);
            toast.success('Link copiado para a área de transferência!');
        } catch (error) {
            console.error('Error copying link:', error);
            toast.error('Erro ao copiar link');
        }
    };

    const openPublicLink = () => {
        if (publicLink) {
            window.open(publicLink, '_blank');
        } else {
            toast.error('Link não disponível');
        }
    };

    return (
        <div className="w-52 bg-white dark:bg-gray-800 shadow-[0px_0px_15px_rgba(0,0,0,0.09)] dark:shadow-[0px_0px_15px_rgba(255,255,255,0.05)] p-6 space-y-3 relative overflow-hidden cursor-pointer hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] dark:hover:shadow-[0px_0px_20px_rgba(255,255,255,0.1)] transition-all duration-300">
            {/* Círculo com símbolo no canto */}
            <div className="w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-full absolute -right-4 -top-6">
                <div className="absolute bottom-5 left-5">
                    <Share2 className="w-6 h-6 text-white" />
                </div>
            </div>
            
            {/* Ícone principal */}
            <div className="w-10">
                <Share2 className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            
            {/* Título */}
            <h1 className="font-bold text-lg text-gray-900 dark:text-white">Link Público</h1>
            
            {/* Informações */}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-5">
                {loading ? 'A carregar...' : 'Para partilhar'}
            </p>

            {/* Botões de ação */}
            <div className="flex gap-2 pt-2">
                <button 
                    onClick={copyPublicLink}
                    disabled={loading || !publicLink}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Copy className="w-3 h-3" />
                    Copiar
                </button>
                <button 
                    onClick={openPublicLink}
                    disabled={loading || !publicLink}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <ExternalLink className="w-3 h-3" />
                    Abrir
                </button>
            </div>
        </div>
    );
} 