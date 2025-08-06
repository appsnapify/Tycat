import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMemberType } from '@/lib/database.types';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/app/_providers/auth-provider';

interface TeamMembersListProps {
  initialMembers: TeamMemberType[];
  teamId: string;
  fallbackUserId?: string;
}

export function TeamMembersList({ 
  initialMembers, 
  teamId,
  fallbackUserId 
}: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMemberType[]>(initialMembers || []);
  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    // Se temos membros iniciais, use-os
    if (initialMembers && initialMembers.length > 0) {
      setMembers(initialMembers);
      return;
    }

    // Caso contrário, tente carregar membros 
    const loadMembers = async () => {
      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*, users(email, user_metadata)')
          .eq('team_id', teamId);

        if (error) {
          console.error('Erro ao carregar membros da equipe:', error);
          
          // Se falhar, pelo menos adicione o usuário atual como membro
          if (fallbackUserId || user?.id) {
            const currentUserId = fallbackUserId || user?.id;
            const fallbackMember = {
              id: 'temp-id',
              user_id: currentUserId,
              team_id: teamId,
              role: 'chefe-equipe',
              created_at: new Date().toISOString(),
              users: {
                email: user?.email || 'sem-email@example.com',
                user_metadata: user?.user_metadata || {}
              }
            };
            setMembers([fallbackMember]);
          }
          return;
        }

        if (data) {
          setMembers(data);
        }
      } catch (error) {
        console.error('Falha ao carregar membros:', error);
        toast.error('Não foi possível carregar os membros da equipe');
      }
    };

    loadMembers();
  }, [initialMembers, teamId, fallbackUserId, user, supabase]);

  // Obter iniciais do nome para o avatar
  const getInitials = (member: TeamMemberType): string => {
    // Tenta obter o nome completo dos metadados
    const fullName = member.users?.user_metadata?.full_name;
    
    if (fullName) {
      const words = fullName.split(' ');
      if (words.length >= 2) {
        return `${words[0][0]}${words[1][0]}`.toUpperCase();
      }
      return fullName.substring(0, 2).toUpperCase();
    }
    
    // Fallback para email
    if (member.users?.email) {
      return member.users.email.substring(0, 2).toUpperCase();
    }
    
    return 'US';
  };

  // Obter nome para exibição
  const getDisplayName = (member: TeamMemberType): string => {
    // Primeiro tenta o nome completo
    if (member.users?.user_metadata?.full_name) {
      return member.users.user_metadata.full_name;
    }
    
    // Depois tenta o email
    if (member.users?.email) {
      return member.users.email.split('@')[0];
    }
    
    // Fallback
    return 'Usuário';
  };

  // Traduz o papel para exibição
  const translateRole = (role: string): string => {
    const roleMap: Record<string, string> = {
      'chefe-equipe': 'Chefe de Equipe',
      'promotor': 'Promotor',
      'team-leader': 'Chefe de Equipe',
      'promoter': 'Promotor'
    };
    return roleMap[role] || role;
  };

  // Seleciona a cor do badge baseado no papel
  const getRoleBadgeVariant = (role: string): 'default' | 'outline' | 'secondary' | 'destructive' => {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('chefe') || normalizedRole.includes('leader')) {
      return 'default';
    }
    return 'secondary';
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Membro</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Função</TableHead>
            <TableHead className="hidden md:table-cell">Ingresso</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                Nenhum membro encontrado
              </TableCell>
            </TableRow>
          ) : (
            members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(member)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{getDisplayName(member)}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.users?.email || 'Email não disponível'}
                </TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {translateRole(member.role)}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
} 