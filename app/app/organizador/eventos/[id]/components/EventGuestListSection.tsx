'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import GuestListTable from '../GuestListTable';

interface EventGuestListSectionProps {
  eventId: string;
}

export default function EventGuestListSection({ eventId }: EventGuestListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista de Convidados</CardTitle>
        <CardDescription>Todos os convidados registrados para este evento</CardDescription>
      </CardHeader>
      <CardContent>
        <GuestListTable eventId={eventId} />
      </CardContent>
    </Card>
  );
}

