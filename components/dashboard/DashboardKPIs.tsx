'use client';

import { StatCard } from '@/components/dashboard/stat-card';
import { Users, CalendarDays, Building, UserPlus } from 'lucide-react';

interface KPIs {
  totalEvents: number;
  upcomingEvents: number;
  teamsCount: number;
  promotersCount: number;
}

interface DashboardKPIsProps {
  kpis: KPIs;
  isLoading: boolean;
}

// ✅ COMPONENTE: Dashboard KPIs (Complexidade: 1)
export function DashboardKPIs({ kpis, isLoading }: DashboardKPIsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard 
        title="Total de Eventos" 
        value={kpis.totalEvents} 
        icon={CalendarDays} 
        loading={isLoading}
        trend="+12% este mês"
      />
      <StatCard 
        title="Eventos Próximos" 
        value={kpis.upcomingEvents} 
        icon={CalendarDays} 
        loading={isLoading}
        trend="+3 esta semana"
      />
      <StatCard 
        title="Equipas" 
        value={kpis.teamsCount} 
        icon={Building} 
        loading={isLoading}
        trend="2 ativas"
      />
      <StatCard 
        title="Promotores" 
        value={kpis.promotersCount} 
        icon={UserPlus} 
        loading={isLoading}
        trend="+5 este mês"
      />
    </div>
  );
}
