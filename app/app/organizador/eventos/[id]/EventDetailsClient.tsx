'use client' // ESSENCIAL: Marcar como Client Component

import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase'; // Não é mais necessário buscar aqui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Checkbox } from '@/components/ui/checkbox'; // Removido - não mais usado
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton'; // Manter para estado de saving (se houver outras ações)
import { toast } from "@/components/ui/use-toast"; // Corrigido import do toast
import { CalendarIcon, MapPinIcon } from 'lucide-react';
// import { supabase } from '@/lib/supabase'; // Removido - não mais usado diretamente aqui para salvar associações
// Import Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// Importar componentes de Tabela
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
// Importar componentes Accordion
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
// Importar novo componente da lista de convidados
import GuestListTable from './GuestListTable'

// Interface para os dados do evento recebidos como props
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
    organization_id: string;
    type?: string;
}

// Removida interface Team

// Interface para Stats de Equipa
interface TeamStat {
    id: string;
    name: string;
    total_guests: number;
    total_checked_in: number;
}

// Interface para Stats de Promotor
interface PromoterStat {
    id: string;
    first_name: string | null;
    last_name: string | null;
    total_guests: number;
    total_checked_in: number;
    team_name?: string;
}

interface EventDetailsClientProps {
    event: EventData;
    totalGuests: number;
    totalCheckedIn: number;
    topTeamsStats: TeamStat[]; // Nova prop
    topPromotersStats: PromoterStat[]; // Nova prop
}

export default function EventDetailsClient({ 
    event, 
    totalGuests, 
    totalCheckedIn, 
    topTeamsStats, 
    topPromotersStats 
}: EventDetailsClientProps) {
    // Removido estado e handlers relacionados a equipas
    // const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(initialAssociatedIds);
    // const [savingAssociations, setSavingAssociations] = useState(false);

    const eventId = event.id;

    // Removida lógica de handleTeamSelectionChange
    // Removida lógica de handleSaveAssociations

    // Função de formatação movida para cá ou para utils
    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Data inválida';
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch (e) {
            console.error("Erro ao formatar data:", e);
            return 'Erro data';
        }
    };

    // Calcular taxa de check-in
    const checkInRate = totalGuests > 0 ? ((totalCheckedIn / totalGuests) * 100).toFixed(1) : '0.0';

    // --- Renderização do Componente Cliente com Tabs ---
    return (
        <Tabs defaultValue="estatisticas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
                <TabsTrigger value="convidados">Convidados</TabsTrigger>
                <TabsTrigger value="informacoes">Informações</TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Visão Geral</CardTitle>
                        <CardDescription>Métricas principais do evento.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Total Convidados</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{totalGuests}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Total Check-ins</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{totalCheckedIn}</p></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium">Taxa Check-in</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0"><p className="text-2xl font-bold">{checkInRate}%</p></CardContent>
                        </Card>
                    </CardContent>
                </Card>

                {/* ACCORDION para Top Stats */}
                <Accordion type="multiple" className="w-full mt-4 space-y-4">

                    {/* Accordion Item Top Equipas */}
                    {topTeamsStats && topTeamsStats.length > 0 && (
                        <AccordionItem value="top-teams" className="border rounded-md">
                            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
                                Top 5 Equipas (por Convidados)
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>Equipa</TableHead>
                                            <TableHead className="text-right">Convidados</TableHead>
                                            <TableHead className="text-right">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topTeamsStats.map((team, index) => (
                                            <TableRow key={team.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{team.name}</TableCell>
                                                <TableCell className="text-right">{team.total_guests}</TableCell>
                                                <TableCell className="text-right">{team.total_checked_in}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Accordion Item Top Promotores */}
                    {topPromotersStats && topPromotersStats.length > 0 && (
                        <AccordionItem value="top-promoters" className="border rounded-md">
                             <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
                                Top 5 Promotores (por Convidados)
                             </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                 <Table>
                                    <TableHeader>
                                         <TableRow>
                                            <TableHead className="w-[50px]">#</TableHead>
                                            <TableHead>Promotor</TableHead>
                                            <TableHead>Equipa</TableHead>
                                            <TableHead className="text-right">Convidados</TableHead>
                                            <TableHead className="text-right">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topPromotersStats.map((promoter, index) => (
                                            <TableRow key={promoter.id}>
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{`${promoter.first_name || ''} ${promoter.last_name || ''}`.trim()}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{promoter.team_name || '-'}</TableCell>
                                                <TableCell className="text-right">{promoter.total_guests}</TableCell>
                                                <TableCell className="text-right">{promoter.total_checked_in}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion> {/* Fim do Accordion geral */}

                {/* Mostrar mensagem se não houver dados para top equipas/promotores */}
                {(!topTeamsStats || topTeamsStats.length === 0) && (!topPromotersStats || topPromotersStats.length === 0) && (
                    <p className="mt-4 text-center text-sm text-muted-foreground">Sem dados de desempenho por equipa ou promotor para este evento.</p>
                )}
            </TabsContent>

            <TabsContent value="convidados" className="mt-4">
                {/* Substituir placeholder pelo componente GuestListTable */}
                <GuestListTable eventId={event.id} /> 
                {/* <Card>
                    <CardHeader>
                        <CardTitle>Lista de Convidados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">Funcionalidade de lista de convidados completa a ser implementada.</p>
                         (Tabela, Pesquisa, Ações serão implementadas aqui) 
                    </CardContent>
                </Card> */}
            </TabsContent>

            <TabsContent value="informacoes" className="mt-4">
                {/* Conteúdo movido para aqui */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{event.title}</CardTitle>
                            <CardDescription>{event.type === 'guest-list' ? 'Guest List' : 'Evento Padrão'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-sm text-gray-500">Descrição</h3>
                                <p>{event.description || 'Sem descrição'}</p>
                            </div>
                            <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                                <span>{formatDate(event.date)} {event.time || ''}</span>
                            </div>
                            {event.end_date && (
                                <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                                    <span>Fim: {formatDate(event.end_date)} {event.end_time || ''}</span>
                                </div>
                            )}
                            {event.location && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 mr-2 text-gray-500" />
                                    <span>{event.location}</span>
                                </div>
                            )}
                            {event.guest_list_open_datetime && (
                                <div className="flex items-center text-xs text-blue-600">
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    <span>Lista Abre: {new Date(event.guest_list_open_datetime).toLocaleString('pt-BR')}</span>
                                </div>
                            )}
                            {event.guest_list_close_datetime && (
                                <div className="flex items-center text-xs text-red-600">
                                    <CalendarIcon className="w-3 h-3 mr-1" />
                                    <span>Lista Fecha: {new Date(event.guest_list_close_datetime).toLocaleString('pt-BR')}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ações específicas de Guest List */}
                    {event.type === 'guest-list' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Ações da Guest List</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-500 mb-4 text-sm">
                                    Acesse as funcionalidades de check-in e veja a página pública.
                                </p>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                    <a href={`/app/organizador/checkin?event=${event.id}`}>
                                        <Button variant="outline" className="w-full">Check-in</Button>
                                    </a>
                                    <a href={`/g/${event.id}`} target="_blank" rel="noopener noreferrer">
                                        <Button variant="default" className="w-full">Ver página pública</Button>
                                    </a>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </TabsContent>
        </Tabs>
    );
} 