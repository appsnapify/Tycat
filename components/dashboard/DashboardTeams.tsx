'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

interface Team {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  promoter_count?: number;
}

interface DashboardTeamsProps {
  teams: Team[];
  isLoading: boolean;
  organizationCode: string | null;
}

// ✅ COMPONENTE: Team Card (Complexidade: 1)
function TeamCard({ team }: { team: Team }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{team.name}</CardTitle>
          <Badge variant={team.is_active ? "default" : "secondary"}>
            {team.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </div>
        {team.description && (
          <CardDescription>{team.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="w-4 h-4 mr-1" />
            {team.promoter_count || 0} promotores
          </div>
          <Link href={`/app/organizador/equipes/${team.id}`}>
            <Button variant="outline" size="sm">
              Ver Detalhes
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE: Loading State (Complexidade: 1)
function TeamsLoadingState() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Equipas
        </CardTitle>
        <CardDescription>Gerencie as suas equipas de promotores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ✅ COMPONENTE PRINCIPAL: Dashboard Teams (Complexidade: 2)
export function DashboardTeams({ teams, isLoading, organizationCode }: DashboardTeamsProps) {
  if (isLoading) { // +1
    return <TeamsLoadingState />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Equipas
            </CardTitle>
            <CardDescription>Gerencie as suas equipas de promotores</CardDescription>
          </div>
          <Link href="/app/organizador/equipes">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Equipa
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {teams.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma equipa encontrada</p>
            <Link href="/app/organizador/equipes">
              <Button>Criar Primeira Equipa</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {teams.slice(0, 4).map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
        
        {teams.length > 4 && (
          <div className="mt-4 text-center">
            <Link href="/app/organizador/equipes">
              <Button variant="outline">
                Ver Todas as Equipas ({teams.length})
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
