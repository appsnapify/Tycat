'use client'

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { useAuth } from '@/app/app/_providers/auth-provider';

interface EventChartsSectionProps {
  eventId: string;
  genderStats: any;
  topTeamsStats: any[];
  topPromotersStats: any[];
}

interface GenderCode {
  M: string;
  F: string;
  O: string;
}

export default function EventChartsSection({ 
  eventId, 
  genderStats, 
  topTeamsStats, 
  topPromotersStats 
}: EventChartsSectionProps) {
  const { supabase } = useAuth();
  const [peakHour, setPeakHour] = useState<{
    hour: string;
    count: number;
    isMultiple?: boolean;
    allPeakHours?: Array<{hour: string, count: number}>;
  }>({ hour: 'N/A', count: 0 });
  const [topLocations, setTopLocations] = useState<{code: string, name: string, count: number}[]>([]);
  const [locationChartData, setLocationChartData] = useState<{name: string, value: number, fill: string}[]>([]);

  // Mapa de cores para gêneros
  const GENDER_COLOR_MAP: { [key in keyof GenderCode]?: string } = {
    'M': '#3b82f6',  // blue-500
    'F': '#1d4ed8',  // blue-700
    'O': '#60a5fa'   // blue-400
  };

  // ✅ FUNÇÕES UTILITÁRIAS (Complexidade: 1 ponto cada)
  const getGenderName = (item: any) => item?.genderName ?? 'Indefinido';
  const getPercentage = (item: any) => item?.percentage ?? 0;
  const getCount = (item: any) => item?.count ?? 0;
  const getGenderColor = (gender: string) => GENDER_COLOR_MAP[gender as keyof GenderCode] ?? '#60a5fa';

  // ✅ FUNÇÃO PRINCIPAL SIMPLIFICADA (Complexidade: 1 ponto)
  const processGenderItem = (item: any) => ({
    name: getGenderName(item),
    value: getPercentage(item),
    count: getCount(item),
    percentage: getPercentage(item),
    fill: getGenderColor(item?.gender)
  });

  // Preparando dados do gráfico de gênero
  const genderChartData = (genderStats?.genderData ?? []).map(processGenderItem);

  // Buscar hora de pico de registro
  useEffect(() => {
    const fetchPeakRegistrationHour = async () => {
      if (!supabase || !eventId) return;

      try {
        const { data, error } = await supabase
          .rpc('get_peak_registration_hour', { event_id_param: eventId });

        if (error) {
          console.error('Erro ao buscar hora de pico de registro:', error);
          return;
        }

        if (data && data.length > 0) {
          const maxCount = Math.max(...data.map((item: any) => item.count));
          const peakHours = data.filter((item: any) => item.count === maxCount);

          if (peakHours.length > 1) {
            setPeakHour({
              hour: `${peakHours.length} horários`,
              count: maxCount,
              isMultiple: true,
              allPeakHours: peakHours
            });
          } else {
            setPeakHour({
              hour: peakHours[0].hour,
              count: maxCount
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar hora de pico:', error);
      }
    };

    fetchPeakRegistrationHour();
  }, [supabase, eventId]);

  // Buscar top localizações
  useEffect(() => {
    const fetchTopLocations = async () => {
      if (!supabase || !eventId) return;

      try {
        const { data, error } = await supabase
          .rpc('get_top_locations_for_event', { event_id_param: eventId });

        if (error) {
          console.error('Erro ao buscar top localizações:', error);
          return;
        }

        if (data && data.length > 0) {
          setTopLocations(data.slice(0, 5));
          
          const chartData = data.slice(0, 5).map((location: any, index: number) => ({
            name: location.name,
            value: location.count,
            fill: `hsl(${index * 72}, 70%, 50%)`
          }));
          setLocationChartData(chartData);
        }
      } catch (error) {
        console.error('Erro ao processar localizações:', error);
      }
    };

    fetchTopLocations();
  }, [supabase, eventId]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Gênero */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Gênero</CardTitle>
          <CardDescription>Percentagem de convidados por género</CardDescription>
        </CardHeader>
        <CardContent>
          {genderChartData.length > 0 ? (
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Localizações */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Localizações</CardTitle>
          <CardDescription>Convidados por localização</CardDescription>
        </CardHeader>
        <CardContent>
          {locationChartData.length > 0 ? (
            <ChartContainer config={{}} className="mx-auto aspect-square max-h-[250px]">
              <PieChart>
                <Pie
                  data={locationChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {locationChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      {/* Estatísticas Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle>Hora de Pico de Registro</CardTitle>
          <CardDescription>Horário com mais registros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{peakHour.hour}</div>
          <p className="text-xs text-muted-foreground">
            {peakHour.count} registros
            {peakHour.isMultiple && peakHour.allPeakHours && (
              <span className="block mt-1">
                Horários: {peakHour.allPeakHours.map(h => h.hour).join(', ')}
              </span>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

