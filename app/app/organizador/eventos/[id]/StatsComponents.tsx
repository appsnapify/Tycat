'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from "@/components/ui/use-toast";
import dynamic from 'next/dynamic';

// Importar ApexCharts com carregamento dinâmico para evitar erros de SSR
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

// Importar react-simple-maps
const MapChart = dynamic(() => import('./MapChart'), { ssr: false });

// Interfaces
interface RegistrationTrend {
    reg_date: string;
    daily_count: number;
    cumulative: number;
}

interface AgeGroup {
    age_group: string;
    count: number;
    percentage: number;
    avg_age: number;
}

interface GeoDistribution {
    postal_code: string;
    city: string;
    latitude: number;
    longitude: number;
    count: number;
}

// Componente 1: Tendência de Registros
export function RegistrationTrendCard({ eventId }: { eventId: string }) {
    const [trendData, setTrendData] = useState<RegistrationTrend[]>([]);
    const [loading, setLoading] = useState(true);

    // Configurações do gráfico
    const [chartOptions, setChartOptions] = useState({
        chart: {
            id: 'registration-trend',
            type: 'area' as const,
            height: 250,
            toolbar: {
                show: false
            },
            fontFamily: 'sans-serif',
            foreColor: '#64748b',
        },
        colors: ['#10b981', '#3b82f6'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.3,
                stops: [0, 90, 100]
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: 'smooth' as const,
            width: 2
        },
        grid: {
            borderColor: '#e2e8f0',
            row: {
                colors: ['#f8fafc', 'transparent'],
                opacity: 0.5
            }
        },
        markers: {
            size: 0
        },
        xaxis: {
            categories: ['--', '--', '--', '--', '--'],
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px'
                }
            }
        },
        legend: {
            position: 'top' as const,
            horizontalAlign: 'right' as const,
            fontSize: '12px',
            markers: {
                width: 10,
                height: 10,
                radius: 50
            }
        },
        tooltip: {
            x: {
                format: 'dd/MM/yy'
            }
        }
    });

    const [chartSeries, setChartSeries] = useState([
        {
            name: 'Diário',
            data: [0, 0, 0, 0, 0]
        },
        {
            name: 'Acumulado',
            data: [0, 0, 0, 0, 0]
        }
    ]);

    useEffect(() => {
        const fetchTrendData = async () => {
            setLoading(true);
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.rpc('get_registration_trend', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setTrendData(data);
                    
                    // Preparar dados para o gráfico
                    const dates = data.map(item => {
                        const date = new Date(item.reg_date);
                        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                    });
                    
                    const dailyCounts = data.map(item => item.daily_count);
                    const cumulativeCounts = data.map(item => item.cumulative);
                    
                    setChartOptions({
                        ...chartOptions,
                        xaxis: {
                            ...chartOptions.xaxis,
                            categories: dates
                        }
                    });
                    
                    setChartSeries([
                        {
                            name: 'Diário',
                            data: dailyCounts
                        },
                        {
                            name: 'Acumulado',
                            data: cumulativeCounts
                        }
                    ]);
                }
            } catch (error) {
                console.error('Erro ao buscar dados de tendência:', error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados de tendência de registros.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        
        if (eventId) {
            fetchTrendData();
        }
    }, [eventId]);

    return (
        <Card className="overflow-hidden border shadow-sm">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1"></div>
            <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-gray-500">Tendência de Registros</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <div className="h-64">
                        {trendData.length > 0 ? (
                            typeof window !== 'undefined' && (
                                <Chart
                                    options={chartOptions}
                                    series={chartSeries}
                                    type="area"
                                    height="100%"
                                />
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-500">
                                Sem dados de tendência disponíveis
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Componente 2: Distribuição por Idade
export function AgeDistributionCard({ eventId }: { eventId: string }) {
    const [ageData, setAgeData] = useState<AgeGroup[]>([]);
    const [avgAge, setAvgAge] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    // Configurações do gráfico de barras
    const [chartOptions, setChartOptions] = useState({
        chart: {
            id: 'age-distribution',
            type: 'bar' as const,
            height: 250,
            toolbar: {
                show: false
            },
            fontFamily: 'sans-serif',
            foreColor: '#64748b',
        },
        colors: ['#8b5cf6', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: false,
                columnWidth: '70%',
                distributed: true
            }
        },
        dataLabels: {
            enabled: false
        },
        grid: {
            borderColor: '#e2e8f0',
            row: {
                colors: ['#f8fafc', 'transparent'],
                opacity: 0.5
            }
        },
        xaxis: {
            categories: ['--', '--', '--', '--', '--'],
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px'
                }
            }
        },
        yaxis: {
            labels: {
                style: {
                    colors: '#64748b',
                    fontSize: '12px'
                }
            }
        },
        legend: {
            show: false
        },
        tooltip: {
            y: {
                formatter: function(val: number) {
                    return val + " convidados";
                }
            }
        }
    });

    const [chartSeries, setChartSeries] = useState([
        {
            name: 'Convidados',
            data: [0, 0, 0, 0, 0]
        }
    ]);

    useEffect(() => {
        const fetchAgeData = async () => {
            setLoading(true);
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.rpc('get_age_distribution', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setAgeData(data);
                    
                    // Extrair idade média (todos os grupos têm o mesmo valor)
                    if (data[0]?.avg_age) {
                        setAvgAge(data[0].avg_age);
                    }
                    
                    // Preparar dados para o gráfico
                    const ageGroups = data.map(item => item.age_group);
                    const counts = data.map(item => item.count);
                    
                    setChartOptions({
                        ...chartOptions,
                        xaxis: {
                            ...chartOptions.xaxis,
                            categories: ageGroups
                        }
                    });
                    
                    setChartSeries([
                        {
                            name: 'Convidados',
                            data: counts
                        }
                    ]);
                }
            } catch (error) {
                console.error('Erro ao buscar dados de idade:', error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados de distribuição por idade.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        
        if (eventId) {
            fetchAgeData();
        }
    }, [eventId]);

    return (
        <Card className="overflow-hidden border shadow-sm">
            <div className="bg-gradient-to-r from-violet-500 to-violet-400 h-1"></div>
            <CardHeader className="p-4">
                <CardTitle className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-500">Distribuição por Idade</span>
                    {avgAge !== null && (
                        <span className="text-sm font-bold bg-violet-100 text-violet-800 py-1 px-2 rounded-full">
                            Idade Média: {avgAge} anos
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-32 w-full" />
                    </div>
                ) : (
                    <div className="h-64">
                        {ageData.length > 0 ? (
                            typeof window !== 'undefined' && (
                                <Chart
                                    options={chartOptions}
                                    series={chartSeries}
                                    type="bar"
                                    height="100%"
                                />
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-500">
                                Sem dados de idade disponíveis
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Componente 3: Distribuição Geográfica
export function GeographicDistributionCard({ eventId }: { eventId: string }) {
    const [geoData, setGeoData] = useState<GeoDistribution[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGeoData = async () => {
            setLoading(true);
            try {
                const supabase = createClientComponentClient();
                const { data, error } = await supabase.rpc('get_geographic_distribution', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setGeoData(data);
                }
            } catch (error) {
                console.error('Erro ao buscar dados geográficos:', error);
                toast({
                    title: "Erro",
                    description: "Não foi possível carregar os dados de distribuição geográfica.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        };
        
        if (eventId) {
            fetchGeoData();
        }
    }, [eventId]);

    return (
        <Card className="overflow-hidden border shadow-sm">
            <div className="bg-gradient-to-r from-sky-500 to-sky-400 h-1"></div>
            <CardHeader className="p-4">
                <CardTitle className="text-sm font-medium text-gray-500">Distribuição Geográfica</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-48 w-full" />
                    </div>
                ) : (
                    <div className="h-64">
                        {geoData.length > 0 ? (
                            typeof window !== 'undefined' && (
                                <MapChart geoData={geoData} />
                            )
                        ) : (
                            <div className="h-full flex items-center justify-center text-sm text-gray-500">
                                Sem dados geográficos disponíveis
                            </div>
                        )}
                    </div>
                )}
                
                {/* Legenda de cidades */}
                {geoData.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {geoData.slice(0, 6).map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-3 h-3 rounded-full bg-sky-500 opacity-80"></div>
                                <span className="font-medium">{item.city}</span>
                                <span className="text-gray-500">({item.count})</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// Componente que agrupa as três visualizações
export function AdvancedStatsSection({ eventId }: { eventId: string }) {
    // Certifique-se de que eventId é uma string
    const eventIdString = String(eventId);
    
    return (
        <Card className="border shadow-sm bg-gradient-to-br from-white to-gray-50 mt-6">
            <CardHeader>
                <CardTitle className="text-xl text-gray-800">Análises Avançadas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
                <RegistrationTrendCard eventId={eventIdString} />
                <AgeDistributionCard eventId={eventIdString} />
                <GeographicDistributionCard eventId={eventIdString} />
            </CardContent>
        </Card>
    );
} 