'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EventStatsSectionProps {
  totalGuests: number;
  totalCheckedIn: number;
  checkInRate: number;
}

export default function EventStatsSection({ 
  totalGuests, 
  totalCheckedIn, 
  checkInRate 
}: EventStatsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de Convidados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGuests}</div>
          <p className="text-xs text-muted-foreground">Registrados no evento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Check-ins Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCheckedIn}</div>
          <p className="text-xs text-muted-foreground">Convidados presentes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Taxa de Check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{checkInRate}%</div>
          <p className="text-xs text-muted-foreground">
            {checkInRate > 70 ? 'Excelente participação' : 
             checkInRate > 50 ? 'Boa participação' : 
             'Participação baixa'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

