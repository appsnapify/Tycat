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
import { useAuth } from '@/app/app/_providers/auth-provider';

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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

// Chart components agora usam shadcn/ui com Recharts

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

// ✅ NOVA: Função helper para chamadas RPC resilientes
const callRPCWithRetry = async (supabase: any, funcName: string, params: any, retries = 2) => {
    for (let i = 0; i <= retries; i++) {
        try {
            const { data, error } = await supabase.rpc(funcName, params);
            
            if (error) {
                // Se for erro de permissão e ainda temos tentativas, tentar refresh
                if (error.code === '42501' && i < retries) {
                    console.log(`[${funcName}] Permission denied, refreshing session (attempt ${i + 1})`);
                    await supabase.auth.refreshSession();
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
                    continue;
                }
                throw error;
            }
            
            return { data, error: null };
        } catch (err) {
            if (i === retries) {
                console.error(`[${funcName}] Failed after ${retries + 1} attempts:`, err);
                throw err;
            }
            console.log(`[${funcName}] Attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 300 * (i + 1))); // Progressive delay
        }
    }
};

export default function EventDetailsClient({ 
    event, 
    totalGuests, 
    totalCheckedIn, 
    topTeamsStats, 
    topPromotersStats,
    genderStats
}: EventDetailsClientProps) {
    const { supabase } = useAuth(); // ✅ Usar cliente unificado do AuthProvider
    // Estados
    const [peakHour, setPeakHour] = useState<{
        hour: string;
        count: number;
        isMultiple?: boolean;
        allPeakHours?: Array<{hour: string, count: number}>;
    }>({ hour: 'N/A', count: 0 });
    const [allRegistrationHours, setAllRegistrationHours] = useState<Array<{hour: string, count: number, percentage: number}>>([]);
    const [loading, setLoading] = useState(false);
    const [topLocations, setTopLocations] = useState<{code: string, name: string, count: number}[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);
    
    // Dados para o gráfico de localizações (formato Recharts)
    const [locationChartData, setLocationChartData] = useState<{name: string, value: number, fill: string}[]>([]);
    
    // Preparando dados do gráfico de gênero (cores azuis consistentes)
    const genderChartData = (genderStats?.genderData || []).map((item, index) => {
            const colorMap: { [key in GenderCode]?: string } = {
                'M': '#3b82f6',  // blue-500
                'F': '#1d4ed8',  // blue-700
                'O': '#60a5fa'   // blue-400
            };
        return {
            name: item?.genderName || 'Indefinido',
            value: item?.percentage || 0,
            count: item?.count || 0,
            percentage: item?.percentage || 0,
            fill: colorMap[item?.gender] || '#60a5fa'
        };
    });

    const eventId = event.id;

    // Calcular taxa de check-in
    const checkInRate = totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0;

    // Efeito para buscar hora de pico de REGISTRO (não mais check-in)
    useEffect(() => {
        const fetchPeakHour = async () => {
            setLoading(true);
            try {
                // ✅ Usar função resiliente
                const { data, error } = await callRPCWithRetry(supabase, 'get_peak_registration_hour', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    // Processar TODOS os dados de registos por hora
                    const hourlyData = data.map((item: any) => ({
                        hour: new Date(item.registration_hour).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        }),
                        count: item.count,
                        percentage: totalGuests > 0 ? (item.count / totalGuests) * 100 : 0
                    }));
                    
                    // Ordenar por contagem (maior primeiro)
                    hourlyData.sort((a, b) => b.count - a.count);
                    
                    // Armazenar todos os dados
                    setAllRegistrationHours(hourlyData);
                    
                    // Encontrar o VERDADEIRO horário com mais registros (pico real)
                    if (hourlyData.length > 0) {
                        // Encontrar a contagem máxima real
                        const maxCount = Math.max(...hourlyData.map(h => h.count));
                        // Pegar TODOS os horários com essa contagem máxima (empates)
                        const peakHours = hourlyData.filter(h => h.count === maxCount);
                        
                        if (peakHours.length > 0) {
                            setPeakHour({
                                hour: peakHours.length > 1 
                                    ? `${peakHours.length} horários empatados` 
                                    : peakHours[0].hour,
                                count: maxCount,
                                isMultiple: peakHours.length > 1,
                                allPeakHours: peakHours
                            });
                        } else {
                            setPeakHour({ hour: 'N/A', count: 0 });
                        }
                    } else {
                        setPeakHour({ hour: 'N/A', count: 0 });
                    }
                } else {
                    setPeakHour({ hour: 'N/A', count: 0 });
                    setAllRegistrationHours([]);
                }
            } catch (error) {
                console.error('Erro ao buscar horário de pico de registro:', error);
                setPeakHour({ hour: 'N/A', count: 0 });
                setAllRegistrationHours([]);
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
    }, [eventId, totalGuests, supabase]);

    // Novo efeito para buscar localidades principais
    useEffect(() => {
        const fetchTopLocations = async () => {
            setLoadingLocations(true);
            try {
                // ✅ Usar função resiliente
                const { data, error } = await callRPCWithRetry(supabase, 'get_top_locations_for_event', {
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

                    // Cores para o gráfico Recharts
                    const colors = ['#818cf8', '#4f46e5', '#4338ca', '#3730a3', '#312e81', '#6366f1'];
                    
                    const chartData = locationData.map((loc, index) => ({
                        name: loc.name === 'Desconhecido' ? 'Desconhecido' : `${loc.name} (${loc.code})`,
                        value: loc.count,
                        fill: colors[index % colors.length]
                    }));

                    setLocationChartData(chartData);
                } else {
                    setLocationChartData([{
                        name: "Sem dados de localização",
                        value: 1,
                        fill: '#e5e7eb'
                    }]);
                    setTopLocations([]);
                }
            } catch (error) {
                console.error('Erro ao buscar localidades:', error);
                setLocationChartData([{
                    name: "Erro ao carregar dados",
                    value: 1,
                    fill: '#ef4444'
                }]);
                setTopLocations([]);
            } finally {
                setLoadingLocations(false);
            }
        };
        
        if (eventId) {
            fetchTopLocations();
        }
    }, [eventId, supabase]);

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

    // --- Renderização do Componente Cliente com Tabs ---
    return (
        <Tabs defaultValue="estatisticas" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-gray-100 p-1 rounded-lg">
                <TabsTrigger 
                    value="estatisticas"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                    Estatísticas
                </TabsTrigger>
                <TabsTrigger 
                    value="convidados"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                    Convidados
                </TabsTrigger>
                <TabsTrigger 
                    value="informacoes"
                    className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
                >
                    Informações
                </TabsTrigger>
            </TabsList>

            <TabsContent value="estatisticas" className="mt-0">
                <Card className="rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] bg-white border-gray-200 hover:border-gray-300 transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="font-semibold text-lg text-gray-900">Visão Geral</CardTitle>
                        <CardDescription className="text-sm text-gray-500">Métricas principais do evento</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-600 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Total de Guest</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-baseline">
                                    <p className="text-2xl font-bold text-gray-900 mr-2 transition-all duration-300 hover:scale-105">
                                        {totalGuests}
                                    </p>
                                    <span className="text-xs text-gray-500">pessoas</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-600 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Total Check-ins</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex items-baseline">
                                    <p className="text-2xl font-bold text-gray-900 mr-2 transition-all duration-300 hover:scale-105">
                                        {totalCheckedIn}
                                    </p>
                                    <span className="text-xs text-gray-500">check-ins</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-600 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Taxa Check-in</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="flex flex-col">
                                    <p className="text-2xl font-bold text-gray-900 transition-all duration-300 hover:scale-105">
                                        {checkInRate}%
                                    </p>
                                    <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-600 transition-all duration-1000 ease-out" 
                                            style={{ width: `${checkInRate}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </CardContent>
                    
                    {/* Segunda fileira de Cards - Métricas Adicionais */}
                    <CardContent className="grid gap-4 md:grid-cols-3 mt-4">
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-500 h-1"></div>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium text-gray-500">Distribuição por Gênero</CardTitle>
                                <CardDescription className="text-xs text-gray-400">Análise demográfica</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                {genderChartData && genderChartData.length > 0 ? (
                                    <div className="space-y-3">
                                        {/* Bar Chart inspirado na imagem */}
                                        <div className="flex items-end justify-between h-24 gap-2">
                                            {(() => {
                                                const maxCount = Math.max(...genderChartData.map(item => item.count || 0));
                                                return genderChartData.map((item, index) => {
                                                    const heightPercentage = maxCount > 0 ? ((item.count || 0) / maxCount) * 100 : 5;
                                                    // Converter percentual para pixels (container h-24 = 96px, usar 80px max para deixar espaço para label)
                                                    const heightInPixels = Math.max((heightPercentage / 100) * 80, 8);
                                                    return (
                                                        <div key={item.name} className="flex flex-col items-center flex-1">
                                                            <div 
                                                                className="w-full bg-blue-400 rounded-t-sm transition-all duration-500 hover:bg-blue-500"
                                                                style={{ 
                                                                    height: `${heightInPixels}px`
                                                                }}
                                                                title={`${item.name}: ${item.count} (${(item.percentage || 0).toFixed(1)}%)`}
                                                            ></div>
                                                            <span className="text-[10px] text-gray-500 mt-1 text-center">
                                                                {item.name.charAt(0)}
                                                            </span>
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                        
                                        {/* Legenda compacta */}
                                        <div className="space-y-1">
                                            {genderChartData.map((item, index) => (
                                                <div key={item.name} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                                        <span className="text-gray-600">{item.name}</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900">{item.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-32 flex items-center justify-center text-sm text-gray-500">
                                        Sem dados de gênero disponíveis
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Card Principal - Horário de Pico */}
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-500 h-1"></div>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                    <span>⏰</span> Pico de Registos
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">Melhor momento para promoção</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                {loading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-8 w-20" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                ) : (
                                    <>
                                        {peakHour.count > 0 ? (
                                            <div className="space-y-3">
                                                {/* Horário de Pico Principal */}
                                                <div className="space-y-2">
                                                    <div className="flex items-baseline">
                                                        <span className="text-lg font-bold text-blue-600 mr-2">🔥</span>
                                                        <p className="text-xl font-bold text-gray-900">
                                                            {peakHour.isMultiple ? `${peakHour.allPeakHours?.length} Picos Empatados` : peakHour.hour}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* Mostrar todos os horários empatados se houver múltiplos */}
                                                    {peakHour.isMultiple && peakHour.allPeakHours && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {peakHour.allPeakHours.map((peak, index) => (
                                                                <span key={`peak-${index}`} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md font-medium">
                                                                    {peak.hour}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Estatísticas do Pico */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm text-gray-600">Registos por hora</span>
                                                        <span className="font-semibold text-gray-900">{peakHour.count}</span>
                                                    </div>
                                                    
                                                    {/* Percentagem do total */}
                                                    {totalGuests > 0 && (
                                                        <>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-600">% do total</span>
                                                                <span className="font-semibold text-blue-600">
                                                                    {((peakHour.count / totalGuests) * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            
                                                            {/* Barra de progresso visual */}
                                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
                                                                    style={{ width: `${Math.min((peakHour.count / totalGuests) * 100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-gray-500">📊 Sem dados de registo disponíveis</p>
                                                <p className="text-xs text-gray-400 mt-1">Os dados aparecerão conforme os registos chegam</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* Card Lateral - Análise Temporal */}
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-500 h-1"></div>
                            <CardHeader className="p-4">
                                <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                    <span>📊</span> Análise Temporal
                                </CardTitle>
                                <CardDescription className="text-xs text-gray-400">Distribuição de registos por hora</CardDescription>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                {loading ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                ) : (
                                    <>
                                        {allRegistrationHours.length > 0 ? (
                                            <div className="space-y-3">
                                                {/* Header com resumo */}
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-medium text-gray-600">Todos os Registos</h4>
                                                    <span className="text-xs text-gray-400">{totalGuests} total</span>
                                                </div>
                                                
                                                {/* Lista de todos os horários */}
                                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                                    {allRegistrationHours.map((hourData, index) => (
                                                        <div key={`${hourData.hour}-${index}`} className="flex items-center justify-between text-xs">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-2 h-2 rounded-full ${hourData.count === peakHour.count ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                                                <span className={`font-medium ${hourData.count === peakHour.count ? 'text-blue-600' : 'text-gray-600'}`}>
                                                                    {hourData.hour}
                                                                </span>
                                                                {hourData.count === peakHour.count && <span className="text-xs text-blue-500">🔥</span>}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900">{hourData.count}</span>
                                                                <span className="text-gray-500">({hourData.percentage.toFixed(1)}%)</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                {/* Resumo estatístico */}
                                                <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                                    <span className="font-medium">Resumo:</span> Registos distribuídos em {allRegistrationHours.length} hora{allRegistrationHours.length > 1 ? 's' : ''} diferente{allRegistrationHours.length > 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4">
                                                <p className="text-sm text-gray-500">📊 Sem dados temporais disponíveis</p>
                                                <p className="text-xs text-gray-400 mt-1">A análise aparecerá com mais registos</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </CardContent>

                    {/* Terceira fileira - Cidades */}
                    <CardContent className="mt-4">
                        <Card className="overflow-hidden rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200 transition-all duration-300">
                            <div className="bg-blue-500 h-1"></div>
                            <CardHeader className="p-4"><CardTitle className="text-sm font-medium text-gray-500">Cidades</CardTitle></CardHeader>
                            <CardContent className="p-4 pt-0">
                                {loadingLocations ? (
                                    <div className="space-y-2">
                                        <Skeleton className="h-32 w-full" />
                                    </div>
                                ) : (
                                    <>
                                        {topLocations.length > 0 ? (
                                            <div className="space-y-3">
                                                {topLocations.slice(0, 6).map((location, index) => {
                                                    const maxCount = Math.max(...topLocations.map(l => l.count));
                                                    const percentage = maxCount > 0 ? (location.count / maxCount) * 100 : 0;
                                                    
                                                    return (
                                                        <div key={`${location.code}-${index}`} className="flex items-center gap-3">
                                                            <div className="w-20 text-xs font-medium text-blue-600 truncate">
                                                                {location.name || location.code}
                                                            </div>
                                                            <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                                                                <div 
                                                                    className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out"
                                                                    style={{ width: `${percentage}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="w-8 text-xs font-medium text-gray-700 text-right">
                                                                {location.count}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                        <AccordionItem value="top-teams" className="rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200">
                            <AccordionTrigger className="px-4 py-3 text-base font-semibold text-gray-900 hover:no-underline hover:bg-gray-50 rounded-t-xl">
                                Top 5 Equipas (por Convidados)
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-gray-50">
                                        <TableRow>
                                            <TableHead className="w-[50px] font-medium text-gray-700">#</TableHead>
                                            <TableHead className="font-medium text-gray-700">Equipa</TableHead>
                                            <TableHead className="text-right font-medium text-gray-700">Convidados</TableHead>
                                            <TableHead className="text-right font-medium text-gray-700">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topTeamsStats.map((team, index) => (
                                            <TableRow key={team.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium text-gray-900">{index + 1}</TableCell>
                                                <TableCell className="text-gray-900">{team.name}</TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">{team.total_guests}</TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">{team.total_checked_in}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionContent>
                        </AccordionItem>
                    )}

                    {/* Accordion Item Top Promotores */}
                    {topPromotersStats && topPromotersStats.length > 0 && (
                        <AccordionItem value="top-promoters" className="rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] bg-white border-gray-200">
                             <AccordionTrigger className="px-4 py-3 text-base font-semibold text-gray-900 hover:no-underline hover:bg-gray-50 rounded-t-xl">
                                Top 5 Promotores (por Convidados)
                             </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4 overflow-x-auto">
                                 <Table>
                                    <TableHeader className="bg-gray-50">
                                         <TableRow>
                                            <TableHead className="w-[50px] font-medium text-gray-700">#</TableHead>
                                            <TableHead className="font-medium text-gray-700">Promotor</TableHead>
                                            <TableHead className="font-medium text-gray-700">Equipa</TableHead>
                                            <TableHead className="text-right font-medium text-gray-700">Convidados</TableHead>
                                            <TableHead className="text-right font-medium text-gray-700">Check-ins</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {topPromotersStats.map((promoter, index) => (
                                            <TableRow key={promoter.id} className="hover:bg-gray-50">
                                                <TableCell className="font-medium text-gray-900">{index + 1}</TableCell>
                                                <TableCell className="text-gray-900">{`${promoter.first_name || ''} ${promoter.last_name || ''}`.trim()}</TableCell>
                                                <TableCell className="text-xs text-gray-500">{promoter.team_name || '-'}</TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">{promoter.total_guests}</TableCell>
                                                <TableCell className="text-right font-medium text-blue-600">{promoter.total_checked_in}</TableCell>
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
                    <Card className="rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] bg-white border-gray-200 hover:border-gray-300 transition-all duration-300 overflow-hidden">
                        <div className="bg-blue-600 h-1"></div>
                        <CardHeader>
                            <CardTitle className="font-semibold text-lg text-gray-900">{event.title}</CardTitle>
                            <CardDescription>
                                {event.type === 'guest-list' ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                        Guest List
                                    </span>
                                ) : 'Evento Padrão'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="font-medium text-sm text-gray-500 mb-1">Descrição</h3>
                                <p className="text-sm text-gray-700">{event.description || 'Sem descrição'}</p>
                            </div>
                            <div className="flex items-center">
                                <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
                                <span className="text-sm text-gray-700">{formatDate(event.date)} {event.time || ''}</span>
                            </div>
                            {event.end_date && (
                                <div className="flex items-center">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    <span className="text-sm text-gray-700">Fim: {formatDate(event.end_date)} {event.end_time || ''}</span>
                                </div>
                            )}
                            {event.location && (
                                <div className="flex items-center">
                                    <MapPinIcon className="w-4 h-4 mr-2 text-blue-600" />
                                    <span className="text-sm text-gray-700">{event.location}</span>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                            <a href={`/app/organizador/checkin?event=${event.id}`}>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-sm">
                                    <QrCode className="w-4 h-4 mr-2" />
                                    Modo Check-in
                                </Button>
                            </a>
                            <a href={`/g/${event.id}`} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver Página Pública
                                </Button>
                            </a>
                            <a href={`/app/organizador/eventos/criar?id=${event.id}`}>
                                <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                                    <PencilIcon className="w-4 h-4 mr-2" />
                                    Editar Evento
                                </Button>
                            </a>
                        </CardFooter>
                    </Card>

                    {/* Bloco de Datas da Guest List (se aplicável) */}
                    {event.type === 'guest-list' && (
                        <Card className="rounded-xl shadow-[0px_0px_15px_rgba(0,0,0,0.09)] hover:shadow-[0px_0px_20px_rgba(0,0,0,0.15)] bg-white border-gray-200 hover:border-gray-300 transition-all duration-300 overflow-hidden">
                            <div className="bg-blue-500 h-1"></div>
                            <CardHeader>
                                <CardTitle className="font-semibold text-lg text-gray-900">Configurações da Guest List</CardTitle>
                                <CardDescription className="text-sm text-gray-500">Datas e horários para registro de convidados</CardDescription>
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
            </TabsContent>
        </Tabs>
    );
} 