import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TeamType } from '@/lib/database.types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clipboard } from 'lucide-react';
import { toast } from 'sonner';

interface TeamHeaderProps {
  teamData: TeamType;
  userData: any;
}

export function TeamHeader({ teamData, userData }: TeamHeaderProps) {
  // Função para copiar o código da equipe para a área de transferência
  const copyTeamCode = () => {
    if (teamData.team_code) {
      navigator.clipboard.writeText(teamData.team_code);
      toast.success('Código da equipe copiado!');
    } else {
      toast.error('Código da equipe não disponível');
    }
  };

  // Obter iniciais do nome da equipe para o avatar
  const getTeamInitials = (name: string): string => {
    if (!name) return 'TE';
    const words = name.split(' ');
    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Obter nome do usuário dos metadados
  const getUserName = (): string => {
    if (userData?.user?.user_metadata?.full_name) {
      return userData.user.user_metadata.full_name;
    }
    return userData?.user?.email?.split('@')[0] || 'Usuário';
  };

  const teamInitials = getTeamInitials(teamData.name);
  const userName = getUserName();

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl font-semibold bg-primary text-primary-foreground">
            {teamInitials}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {teamData.name || 'Minha Equipe'}
          </h1>
          <p className="text-muted-foreground">
            Bem-vindo(a), {userName}! Aqui está o dashboard da sua equipe.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="relative">
          <Input
            value={teamData.team_code || 'Código indisponível'}
            readOnly
            className="w-full sm:w-[180px] pr-10"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full"
            onClick={copyTeamCode}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          Código da Equipe
        </div>
      </div>
    </div>
  );
} 