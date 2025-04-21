import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { supabase } from '@/lib/supabase'
import { Loader2, AlertCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface GuestStat {
  id: string;
  created_at: string;
  promoter_id: string | null;
  team_id: string | null;
}

interface EventDetailsClientProps {
  event: Event;
  totalGuests: number;
  totalCheckedIn: number;
}

interface HourlyRegistration {
  hour: string;
  count: number;
}

interface RankedItem {
  id: string;
  name: string;
  count: number;
}

interface NameMap { [id: string]: string; }

export default function EventDetailsClient({ event, totalGuests, totalCheckedIn }: EventDetailsClientProps) {
  const checkInRate = totalGuests > 0 ? ((totalCheckedIn / totalGuests) * 100).toFixed(1) : '0.0';

  const [guestsList, setGuestsList] = useState<GuestStat[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [teamNames, setTeamNames] = useState<NameMap>({});
  const [promoterNames, setPromoterNames] = useState<NameMap>({});
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    if (!event?.id) return;

    let isMounted = true;
    setLoadingGuests(true);
    setStatsError(null);

    async function fetchGuests() {
      console.log(`[EventDetailsClient] Buscando convidados para evento ID: ${event.id}`);
      try {
        const { data, error } = await supabase
          .from('guests')
          .select('id, created_at, promoter_id, team_id')
          .eq('event_id', event.id);

        if (!isMounted) return;

        if (error) {
          console.error("[EventDetailsClient] Erro ao buscar convidados:", error);
          throw new Error('Falha ao carregar dados dos convidados.');
        }

        console.log(`[EventDetailsClient] Convidados carregados: ${data?.length ?? 0}`);
        setGuestsList(data || []);

      } catch (err) {
        if (!isMounted) return;
        console.error("[EventDetailsClient] Catch ao buscar convidados:", err);
        setStatsError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar convidados.');
      } finally {
        if (isMounted) {
          setLoadingGuests(false);
        }
      }
    }

    fetchGuests();

    return () => { 
      isMounted = false; 
      console.log("[EventDetailsClient] Limpeza useEffect convidados");
    };
  }, [event?.id]);

  const hourlyRegistrations: HourlyRegistration[] = useMemo(() => {
    if (!guestsList || guestsList.length === 0) return [];

    const counts: { [hour: number]: number } = {};
    for (let i = 0; i < 24; i++) { counts[i] = 0; }

    guestsList.forEach(guest => {
      try {
        const hour = new Date(guest.created_at).getHours();
        if (counts[hour] !== undefined) {
          counts[hour]++;
        }
      } catch (e) {
        console.warn("Erro ao processar data de registo:", guest.created_at, e);
      }
    });

    return Object.entries(counts).map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count,
    }));
  }, [guestsList]);

  const { teamCounts, promoterCounts, uniqueTeamIds, uniquePromoterIds } = useMemo(() => {
    const teamCountsMap: { [id: string]: number } = {};
    const promoterCountsMap: { [id: string]: number } = {};
    const teamIds = new Set<string>();
    const promoterIds = new Set<string>();

    guestsList.forEach(guest => {
      if (guest.team_id) {
        teamCountsMap[guest.team_id] = (teamCountsMap[guest.team_id] || 0) + 1;
        teamIds.add(guest.team_id);
      }
      if (guest.promoter_id) {
        promoterCountsMap[guest.promoter_id] = (promoterCountsMap[guest.promoter_id] || 0) + 1;
        promoterIds.add(guest.promoter_id);
      }
    });

    return {
      teamCounts: teamCountsMap,
      promoterCounts: promoterCountsMap,
      uniqueTeamIds: Array.from(teamIds),
      uniquePromoterIds: Array.from(promoterIds),
    };
  }, [guestsList]);

  useEffect(() => {
    if (uniqueTeamIds.length === 0 && uniquePromoterIds.length === 0) {
      setLoadingNames(false);
      return;
    }

    let isMounted = true;
    setLoadingNames(true);

    async function fetchNames() {
      try {
        const teamNamesMap: NameMap = {};
        const promoterNamesMap: NameMap = {};

        if (uniqueTeamIds.length > 0) {
          console.log("[EventDetailsClient] Buscando nomes das equipas:", uniqueTeamIds);
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .in('id', uniqueTeamIds);
          if (teamsError) throw new Error(`Erro ao buscar equipas: ${teamsError.message}`);
          teamsData?.forEach(team => { teamNamesMap[team.id] = team.name; });
        }

        if (uniquePromoterIds.length > 0) {
          console.log("[EventDetailsClient] Buscando nomes dos promotores:", uniquePromoterIds);
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles') 
            .select('id, first_name, last_name')
            .in('id', uniquePromoterIds);
          if (profilesError) throw new Error(`Erro ao buscar promotores: ${profilesError.message}`);
          profilesData?.forEach(profile => {
             promoterNamesMap[profile.id] = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.id;
          });
        }

        if (isMounted) {
          setTeamNames(teamNamesMap);
          setPromoterNames(promoterNamesMap);
        }

      } catch (err) {
        if (isMounted) {
          console.error("[EventDetailsClient] Erro ao buscar nomes:", err);
        }
      } finally {
        if (isMounted) {
          setLoadingNames(false);
        }
      }
    }

    fetchNames();

    return () => { isMounted = false; };
  }, [uniqueTeamIds, uniquePromoterIds]);

  const topTeams: RankedItem[] = useMemo(() => {
    return Object.entries(teamCounts)
      .map(([id, count]) => ({
        id,
        name: teamNames[id] || `Equipa ID: ${id.substring(0, 6)}...`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [teamCounts, teamNames]);

  const topPromoters: RankedItem[] = useMemo(() => {
    return Object.entries(promoterCounts)
      .map(([id, count]) => ({
        id,
        name: promoterNames[id] || `Promotor ID: ${id.substring(0, 6)}...`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [promoterCounts, promoterNames]);

  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="info">Informações</TabsTrigger>
        <TabsTrigger value="guests">Convidados</TabsTrigger>
        <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        <TabsTrigger value="settings">Configurações</TabsTrigger>
      </TabsList>

      <TabsContent value="info" className="mt-4">
        <p>Informações detalhadas sobre o evento.</p>
      </TabsContent>

      <TabsContent value="guests" className="mt-4">
        <p>Placeholder para a lista de convidados.</p>
      </TabsContent>

      <TabsContent value="stats" className="mt-4 space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Convidados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalGuests}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCheckedIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Check-in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkInRate}%</div>
            </CardContent>
          </Card>
        </div>

        {(loadingGuests || loadingNames) && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="ml-2 text-muted-foreground">Carregando estatísticas detalhadas...</p>
          </div>
        )}

        {statsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Estatísticas</AlertTitle>
            <AlertDescription>{statsError}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <p className="md:col-span-2 font-bold text-red-500"> *** TESTE: Se isto aparecer, o problema está nos componentes internos (Card/Recharts). *** </p>
        </div>
      </TabsContent>

      <TabsContent value="settings" className="mt-4">
        <p>Placeholder para as configurações do evento.</p>
      </TabsContent>
    </Tabs>
  );
} 