'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from "@/components/ui/use-toast";
import { useAuth } from '@/app/app/_providers/auth-provider';
import dynamic from 'next/dynamic';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Cell } from "recharts";

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
    const { supabase } = useAuth(); // ✅ Usar cliente unificado

    // Dados para Recharts (formato simples)
    const [chartData, setChartData] = useState<{date: string, daily: number, cumulative: number}[]>([]);

    useEffect(() => {
        const fetchTrendData = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase.rpc('get_registration_trend', {
                    event_id_param: eventId
                });
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    setTrendData(data);
                    
                    // Preparar dados para Recharts
                    const rechartsData = data.map(item => ({
                        date: new Date(item.reg_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        daily: item.daily_count,
                        cumulative: item.cumulative
                    }));
                    
                    setChartData(rechartsData);
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
                        {chartData.length > 0 ? (
                            <ChartContainer
                                config={{
                                    daily: { label: "Diário", color: "#10b981" },
                                    cumulative: { label: "Acumulado", color: "#3b82f6" }
                                }}
                                className="h-full w-full"
                            >
                                <AreaChart width={400} height={250} data={chartData}>
                                    <defs>
                                        <linearGradient id="dailyGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.7}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                                        </linearGradient>
                                        <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.7}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area 
                                        type="monotone" 
                                        dataKey="daily" 
                                        stroke="#10b981" 
                                        fillOpacity={1} 
                                        fill="url(#dailyGradient)"
                                        strokeWidth={2}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="cumulative" 
                                        stroke="#3b82f6" 
                                        fillOpacity={1} 
                                        fill="url(#cumulativeGradient)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ChartContainer>
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
    const { supabase } = useAuth(); // ✅ Usar cliente unificado

    // Dados para Recharts
    const [chartData, setChartData] = useState<{ageGroup: string, count: number, fill: string}[]>([]);

    useEffect(() => {
        const fetchAgeData = async () => {
            setLoading(true);
            try {
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
                    
                    // Preparar dados para Recharts
                    const colors = ['#8b5cf6', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];
                    const rechartsData = data.map((item, index) => ({
                        ageGroup: item.age_group,
                        count: item.count,
                        fill: colors[index % colors.length]
                    }));
                    
                    setChartData(rechartsData);
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
                        {chartData.length > 0 ? (
                            <ChartContainer
                                config={{
                                    count: { label: "Convidados", color: "#8b5cf6" }
                                }}
                                className="h-full w-full"
                            >
                                <BarChart width={400} height={250} data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="ageGroup" 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                    />
                                    <YAxis 
                                        tick={{ fontSize: 12, fill: '#64748b' }}
                                    />
                                    <ChartTooltip 
                                        content={<ChartTooltipContent />}
                                        formatter={(value, name) => [`${value} convidados`, name]}
                                    />
                                    <Bar 
                                        dataKey="count" 
                                        radius={[4, 4, 0, 0]}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
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
    const { supabase } = useAuth(); // ✅ Usar cliente unificado

    useEffect(() => {
        const fetchGeoData = async () => {
            setLoading(true);
            try {
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