'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdvancedStatsSection } from './StatsComponents';

// Importar componentes refatorados
import EventStatsSection from './components/EventStatsSection';
import EventChartsSection from './components/EventChartsSection';
import EventGuestListSection from './components/EventGuestListSection';
import EventSettingsSection from './components/EventSettingsSection';

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
}

// Interface para estatísticas de gênero
interface GenderData {
    gender: string;
    genderName: string;
    count: number;
    percentage: number;
}

interface GenderStats {
    genderData: GenderData[];
}

// Interface para estatísticas de equipes
interface TeamStats {
    team_name: string;
    team_id: string;
    total_guests: number;
    checked_in_guests: number;
    check_in_rate: number;
}

// Interface para estatísticas de promotores
interface PromoterStats {
    promoter_name: string;
    promoter_id: string;
    total_guests: number;
    checked_in_guests: number;
    check_in_rate: number;
}

interface EventDetailsClientProps {
    event: EventData;
    totalGuests: number;
    totalCheckedIn: number;
    topTeamsStats: TeamStats[];
    topPromotersStats: PromoterStats[];
    genderStats: GenderStats;
}

export default function EventDetailsClient({ 
    event, 
    totalGuests, 
    totalCheckedIn, 
    topTeamsStats, 
    topPromotersStats,
    genderStats
}: EventDetailsClientProps) {
    // Calcular taxa de check-in
    const checkInRate = totalGuests > 0 ? Math.round((totalCheckedIn / totalGuests) * 100) : 0;

    return (
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="analytics">Análises</TabsTrigger>
                <TabsTrigger value="guests">Convidados</TabsTrigger>
                <TabsTrigger value="settings">Configurações</TabsTrigger>
            </TabsList>

            {/* Aba de Visão Geral */}
            <TabsContent value="overview" className="space-y-6">
                <EventStatsSection 
                    totalGuests={totalGuests}
                    totalCheckedIn={totalCheckedIn}
                    checkInRate={checkInRate}
                />
                
                <AdvancedStatsSection 
                    topTeamsStats={topTeamsStats}
                    topPromotersStats={topPromotersStats}
                />
            </TabsContent>

            {/* Aba de Análises */}
            <TabsContent value="analytics" className="space-y-6">
                <EventChartsSection 
                    eventId={event.id}
                    genderStats={genderStats}
                    topTeamsStats={topTeamsStats}
                    topPromotersStats={topPromotersStats}
                />
            </TabsContent>

            {/* Aba de Convidados */}
            <TabsContent value="guests">
                <EventGuestListSection eventId={event.id} />
            </TabsContent>

            {/* Aba de Configurações */}
            <TabsContent value="settings">
                <EventSettingsSection event={event} />
            </TabsContent>
        </Tabs>
    );
} 

