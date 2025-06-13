'use client' // ESSENCIAL: Marcar como Client Component

import { useState, useEffect } from 'react';
// import { supabase } from '@/lib/supabase'; // Não é mais necessário buscar aqui
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// import { Checkbox } from '@/components/ui/checkbox'; // Removido - não mais usado
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton'; // Manter para estado de saving (se houver outras ações)
import { toast } from "@/components/ui/use-toast"; // Corrigido import do toast
import { CalendarIcon, MapPinIcon, QrCode, ExternalLink, PencilIcon, Clock, MapPin } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
// import dynamic from 'next/dynamic'; // Comentado para teste
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
// Importar o componente de estatísticas avançadas
import { AdvancedStatsSection } from './StatsComponents';
// import { ApexOptions } from 'apexcharts'; // Comentado para teste

// Importar ApexCharts com carregamento dinâmico para evitar erros de SSR
// const Chart = dynamic(() => import('react-apexcharts'), { ssr: false }); // Comentado para teste

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
    team_name?: string;
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

// Tipo para os códigos de gênero esperados
type GenderCode = 'M' | 'F' | 'O';

// Interface para Estatísticas de Gênero
interface GenderStat {
    gender: GenderCode;
    genderName: string;
    count: number;
    percentage: number;
}

interface GenderStats {
    genderData: GenderStat[];
}

// Interface para o retorno da RPC get_top_locations_for_event
interface RpcLocationStat {
    postal_code: string; 
    location_name: string;
    count: number;
}

interface EventDetailsClientProps {
    event: EventData;
    totalGuests: number;
    totalCheckedIn: number;
    topTeamsStats: TeamStat[]; // Nova prop
    topPromotersStats: PromoterStat[]; // Nova prop
    genderStats: GenderStats; // Nova prop atualizada
}

export default function EventDetailsClient({ 
    event, 
    totalGuests, 
    totalCheckedIn, 
    topTeamsStats, 
    topPromotersStats,
    genderStats
}: EventDetailsClientProps) {
    // Estados
    const [peakHour, setPeakHour] = useState({ hour: 'N/A', count: 0 });
    const [loading, setLoading] = useState(false);
    const [topLocations, setTopLocations] = useState<{code: string, name: string, count: number}[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    
    // Estado para o gráfico de localidades - Comentado para teste
    const [locationChartOptions, setLocationChartOptions] = useState<ApexOptions>({
        labels: ['Carregando...'],
        colors: ['#818cf8', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#6366f1'],
        legend: {
            position: 'bottom',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            offsetY: 5,
            formatter: function(seriesName: string, opts: any) {
                return `${seriesName}: ${opts.w.globals.series[opts.seriesIndex]}`;
            }
        },
        chart: {
            fontFamily: 'sans-serif',
            foreColor: '#64748b',
            animations: {
                enabled: true,
                speed: 500
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '14px',
                            fontFamily: 'sans-serif',
                            formatter: function (w: any) {
                                return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                            }
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    height: 280
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    });
    const [locationChartSeries, setLocationChartSeries] = useState<number[]>([100]);
    
    // Estado para o gráfico de gênero - Comentado para teste
    /*
    const [genderChartOptions, setGenderChartOptions] = useState<ApexOptions>({
        labels: ['Carregando...'],
        colors: ['#3b82f6', '#ec4899', '#8b5cf6'], // Azul, Rosa, Roxo
        legend: {
            position: 'bottom',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            offsetY: 5,
            formatter: function(seriesName: string, opts: any) {
                const value = opts.w.globals.series[opts.seriesIndex];
                const label = opts.w.globals.labels[opts.seriesIndex];
                const genderItem = genderStats.genderData.find(g => g.genderName === label);
                const count = genderItem?.count || 0;
                return `${seriesName}: ${value}% (${count})`;
            }
        },
        chart: {
            fontFamily: 'sans-serif',
            foreColor: '#64748b',
            animations: {
                enabled: true,
                speed: 500
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '60%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total',
                            fontSize: '14px',
                            fontFamily: 'sans-serif',
                            formatter: function (w: any) {
                                return w.globals.seriesTotals.reduce((a: number, b: number) => {
                                    return a + b;
                                }, 0);
                            }
                        }
                    }
                }
            }
        },
        dataLabels: {
            enabled: false
        },
        responsive: [{
            breakpoint: 480,
            options: {
                chart: {
                    height: 280
                },
                legend: {
                    position: 'bottom'
                }
            }
        }]
    });
    const [genderChartSeries, setGenderChartSeries] = useState<number[]>([100]);
    const [genderChartLabels, setGenderChartLabels] = useState<string[]>(['Carregando...']);
    */

    const eventId = event.id;

    // Efeito para atualizar os dados do gráfico de gênero quando a prop mudar
    useEffect(() => {
        if (genderStats && genderStats.genderData && genderStats.genderData.length > 0) {
            const percentages = genderStats.genderData.map(item => item.percentage);
            const labels = genderStats.genderData.map(item => item.genderName);
            
            const colorMap: { [key in GenderCode]?: string } = {
                'M': '#3b82f6',
                'F': '#ec4899',
                'O': '#8b5cf6'
            };
            
            const colors = genderStats.genderData.map(item => 
                colorMap[item.gender] || '#8b5cf6'
            );
            
            // setGenderChartSeries(percentages); // Comentado para teste
            // setGenderChartLabels(labels); // Comentado para teste
            // setGenderChartOptions(prev => ({ // Comentado para teste
            //     ...prev,
            //     labels: labels,
            //     colors: colors,
            //     legend: {
            //         ...prev.legend,
            //         position: prev.legend?.position || 'bottom',
            //         formatter: function(seriesName: string, opts: any) {
            //             const value = opts.w.globals.series[opts.seriesIndex];
            //             const label = opts.w.globals.labels[opts.seriesIndex];
            //             const genderItem = genderStats.genderData.find(g => g.genderName === label);
            //             const count = genderItem?.count || 0;
            //             return `${label}: ${value}% (${count})`;
            //         }
            //     }
            // }));
        }
    }, [genderStats]);

    // Efeito para buscar hora de pico de REGISTRO (não mais check-in)
    useEffect(() => {
        const fetchPeakHour = async () => {
            setLoading(true);
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.rpc('get_peak_registration_hour', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    // Encontrar o horário com mais registros
                    let maxRegistrations = 0;
                    let peakHourData = { hour: 'N/A', count: 0 };
                    
                    data.forEach((item: any) => {
                        if (item.count > maxRegistrations) {
                            maxRegistrations = item.count;
                            peakHourData = {
                                hour: new Date(item.registration_hour).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false
                                }),
                                count: item.count
                            };
                        }
                    });
                    
                    // Só atualizar se houver pelo menos 1 registro
                    if (maxRegistrations > 0) {
                        setPeakHour(peakHourData);
                    } else {
                        setPeakHour({ hour: 'N/A', count: 0 });
                    }
                } else {
                    setPeakHour({ hour: 'N/A', count: 0 });
                }
            } catch (error) {
                console.error('Erro ao buscar horário de pico de registro:', error);
                setPeakHour({ hour: 'N/A', count: 0 });
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar o horário de pico de registro.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        
        if (eventId) {
            fetchPeakHour();
        }
    }, [eventId]);

    // Novo efeito para buscar localidades principais
    useEffect(() => {
        const fetchTopLocations = async () => {
            setLoadingLocations(true);
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.rpc('get_top_locations_for_event', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                const typedData = data as RpcLocationStat[] | null;

                if (typedData && typedData.length > 0) {
                    const locationData = typedData.map((item: RpcLocationStat) => ({
                        code: item.postal_code,
                        name: item.location_name,
                        count: item.count
                    }));
                    
                    setTopLocations(locationData);

                    const labels = locationData.map(loc => 
                        loc.name === 'Desconhecido' ? 'Desconhecido' : `${loc.name} (${loc.code})`
                    );
                    const series = locationData.map(loc => loc.count);

                    setLocationChartSeries(series);
                    setLocationChartOptions(prev => ({
                        ...prev,
                        labels: labels,
                    }));
                } else {
                    setLocationChartSeries([0]);
                    setLocationChartOptions(prev => ({
                        ...prev,
                        labels: ["Sem dados de localização"],
                    }));
                    setTopLocations([]);
                }
            } catch (error) {
                console.error('Erro ao buscar localidades:', error);
                setLocationChartSeries([0]);
                setLocationChartOptions(prev => ({
                    ...prev,
                    labels: ["Erro ao carregar dados"],
                }));
                setTopLocations([]);
            } finally {
                setLoadingLocations(false);
            }
        };
        
        if (eventId) {
            fetchTopLocations();
        }
    }, [eventId]);

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
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                    value="estatisticas"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-lime-600 data-[state=active]:shadow-sm"
                >
                    Estatísticas
                </TabsTrigger>
                <TabsTrigger 
                    value="convidados"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-fuchsia-600 data-[state=active]:shadow-sm"
                >
                    Convidados
                </TabsTrigger>
                <TabsTrigger 
                    value="informacoes"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                >
                    Informações
                </TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas" className="mt-0">
                <Card className="border shadow-sm bg-gradient-to-br from-white to-gray-50">
                    <CardHeader>
                        <CardTitle className="text-xl text-gray-800">Visão Geral</CardTitle>
                        <CardDescription>Métricas principais do evento.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-lime-500 to-lime-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Total Convidados</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-baseline">
                                    <p className="text-2xl font-bold mr-2">{totalGuests}</p>
                                    <span className="text-xs text-gray-500">pessoas</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-fuchsia-500 to-fuchsia-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Total Check-ins</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-baseline">
                                    <p className="text-2xl font-bold mr-2">{totalCheckedIn}</p>
                                    <span className="text-xs text-gray-500">check-ins</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-lime-400 to-fuchsia-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Taxa Check-in</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col">
                                    <p className="text-2xl font-bold">{checkInRate}%</p>
                                    <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-lime-500 to-fuchsia-500" 
                                            style={{ width: `${checkInRate}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                    
                    {/* Segunda fileira de Cards - Métricas Adicionais */}
                    <CardContent className="grid gap-4 md:grid-cols-3 mt-4">
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Distribuição por Gênero</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                {genderStats.genderData.length > 0 ? (
                                    <div className="h-48 flex items-center justify-center text-sm text-gray-500">
                                        {/* Chart comentado para teste */}
                                        Gráfico de Gênero Desativado para Teste
                                    </div>
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-sm text-gray-500">
                                        Sem dados de gênero disponíveis
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Horário de Pico (Registo)</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                {loading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-baseline">
                                            <p className="text-2xl font-bold mr-2">{peakHour.hour}</p>
                                            <span className="text-xs text-gray-500">horário</span>
                                        </div>
                                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                            {peakHour.count > 0 ? (
                                                <>
                                                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                    <span>{peakHour.count} registros neste horário</span>
                                                </>
                                            ) : (
                                                <span>Sem dados de registro disponíveis</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden border shadow-sm">
                            <div className="bg-gradient-to-r from-indigo-500 to-indigo-400 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Origem dos Convidados</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                {loadingLocations ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ) : (
                                    <>
                                        {topLocations.length > 0 ? (
                                            <div className="h-48">
                                                {typeof window !== 'undefined' && (
                                                    <Chart
                                                        options={locationChartOptions}
                                                        series={locationChartSeries}
                                                        type="donut"
                                                        height="100%"
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-32 flex items-center justify-center text-sm text-gray-500">
                                                Sem dados de localização disponíveis
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </CardContent>
                </Card>

                {/* Seção de estatísticas avançadas */}
                <AdvancedStatsSection eventId={String(event.id)} />

                {/* ACCORDION para Top Stats */}
                <Accordion type="multiple" className="w-full mt-4 space-y-4">

                    {/* Accordion Item Top Equipas */}
                    {topTeamsStats && topTeamsStats.length > 0 && (
                        <AccordionItem value="top-teams" className="border rounded-md shadow-sm">
                            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline hover:bg-gray-50 rounded-t-md">
                                Top 5 Equipas (por Convidados)
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-[50px] font-medium">#</TableHead>
                                            <TableHead className="font-medium">Equipa</TableHead>
                                            <TableHead className="text-right font-medium">Convidados</TableHead>
                                            <TableHead className="text-right font-medium">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topTeamsStats.map((team, index) => (
                                            <TableRow key={team.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{team.name}</TableCell>
                                                <TableCell className="text-right font-medium text-lime-600">{team.total_guests}</TableCell>
                                                <TableCell className="text-right font-medium text-fuchsia-600">{team.total_checked_in}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Accordion Item Top Promotores */}
                    {topPromotersStats && topPromotersStats.length > 0 && (
                        <AccordionItem value="top-promoters" className="border rounded-md shadow-sm">
                             <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline hover:bg-gray-50 rounded-t-md">
                                Top 5 Promotores (por Convidados)
                             </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                 <Table>
                                    <TableHeader className="bg-gray-50">
                                         <TableRow>
                                            <TableHead className="w-[50px] font-medium">#</TableHead>
                                            <TableHead className="font-medium">Promotor</TableHead>
                                            <TableHead className="font-medium">Equipa</TableHead>
                                            <TableHead className="text-right font-medium">Convidados</TableHead>
                                            <TableHead className="text-right font-medium">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topPromotersStats.map((promoter, index) => (
                                            <TableRow key={promoter.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>{`${promoter.first_name || ''} ${promoter.last_name || ''}`.trim()}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{promoter.team_name || '-'}</TableCell>
                                                <TableCell className="text-right font-medium text-lime-600">{promoter.total_guests}</TableCell>
                                                <TableCell className="text-right font-medium text-fuchsia-600">{promoter.total_checked_in}</TableCell>
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

            <TabsContent value="convidados" className="mt-0">
                {/* GuestListTable fica intacto */}
                <GuestListTable eventId={event.id} />
            </TabsContent>

            <TabsContent value="informacoes" className="mt-0">
                {/* Conteúdo movido para aqui */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border shadow-sm bg-white overflow-hidden">
                        <div className="bg-gradient-to-r from-lime-500 to-fuchsia-500 h-1"></div>
                        <CardHeader>
                            <CardTitle className="text-xl text-gray-800">{event.title}</CardTitle>
                            <CardDescription>
                                {event.type === 'guest-list' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-fuchsia-100 text-fuchsia-800">
                                        Guest List
                                    </span>
                                ) : 'Evento Padrão'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-semibold text-sm text-gray-500 mb-1">Descrição</h3>
                                <p className="text-gray-700">{event.description || 'Sem descrição'}</p>
                            </div>
                            <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-lime-500" />
                                <span className="text-gray-700">{formatDate(event.date)} {event.time || ''}</span>
                            </div>
                            {event.end_date && (
                                <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-fuchsia-500" />
                                    <span className="text-gray-700">Fim: {formatDate(event.end_date)} {event.end_time || ''}</span>
                                </div>
                            )}
                            {event.location && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 mr-2 text-lime-500" />
                                    <span className="text-gray-700">{event.location}</span>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                            <a href={`/app/organizador/checkin?event=${event.id}`}>
                                <Button className="bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Modo Check-in
                                </Button>
                            </a>
                            <a href={`/g/${event.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="border-fuchsia-200 text-fuchsia-700 hover:bg-fuchsia-50">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver Página Pública
                                </Button>
                            </a>
                            <a href={`/app/organizador/eventos/criar?id=${event.id}`}>
                                <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50">
                                    <PencilIcon className="w-4 h-4 mr-2" />
                                    Editar Evento
                                </Button>
                            </a>
                        </CardFooter>
                    </Card>

                    {/* Bloco de Datas da Guest List (se aplicável) */}
                    {event.type === 'guest-list' && (
                        <Card className="border shadow-sm bg-white overflow-hidden">
                            <div className="bg-gradient-to-r from-fuchsia-500 to-lime-500 h-1"></div>
                            <CardHeader>
                                <CardTitle className="text-lg text-gray-800">Configurações da Guest List</CardTitle>
                                <CardDescription>Datas e horários para registro de convidados</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-500 mb-1">Abertura das Inscrições</h3>
                                    <p className="text-gray-700">
                                        {event.guest_list_open_datetime 
                                            ? new Date(event.guest_list_open_datetime).toLocaleString('pt-BR') 
                                            : 'Não definido'
                                        }
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm text-gray-500 mb-1">Fechamento das Inscrições</h3>
                                    <p className="text-gray-700">
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
            </TabsContent>
        </Tabs>
    );
} 