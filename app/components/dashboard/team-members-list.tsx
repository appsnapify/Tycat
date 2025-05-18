"use client"

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingSpinner } from '@/components/loading-spinner'
import { useAuth } from '@/app/app/_providers/auth-provider'

// Interface para membro da equipe
export interface TeamMember {
  id: string
  user_id: string
  team_id: string
  role: string
  joined_at?: string
  profile?: {
    id: string
    email?: string
    full_name?: string
    avatar_url?: string | null
  }
}

interface TeamMembersListProps {
  initialMembers: TeamMember[]
  teamId: string
  fallbackUserId?: string
}

export function TeamMembersList({ 
  initialMembers, 
  teamId,
  fallbackUserId
}: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [loading, setLoading] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()
  const { session, user } = useAuth()

  // Carregar lista atualizada de membros
  const refreshMembers = async () => {
    try {
      setLoading(true)
      console.log('Atualizando lista de membros para equipe:', teamId)
      
      // Tentar carregar via RPC primeiro
      const { data, error } = await supabase.rpc('get_team_members', {
        team_id_param: teamId
      })
      
      if (error) {
        console.error('Erro ao atualizar membros via RPC:', error)
        
        // Tentar método direto
        const { data: directData, error: directError } = await supabase
          .from('team_members')
          .select(`
            id,
            user_id,
            team_id,
            role,
            joined_at,
            users (
              id,
              email,
              user_metadata
            )
          `)
          .eq('team_id', teamId)
        
        if (directError) {
          console.error('Erro também no método direto:', directError)
          throw new Error(directError.message)
        }
        
        // Processar dados
        const processedMembers = directData.map(member => ({
          ...member,
          profile: {
            id: member.users?.id || member.user_id,
            email: member.users?.email || '',
            full_name: member.users?.user_metadata?.full_name || 
                      member.users?.user_metadata?.name || 
                      member.users?.email || 
                      'Usuário sem nome',
            avatar_url: member.users?.user_metadata?.avatar_url
          }
        }))
        
        setMembers(processedMembers)
      } else {
        console.log(`${data.length} membros atualizados via RPC`)
        setMembers(data)
      }
    } catch (error) {
      console.error('Erro ao atualizar membros:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a lista de membros',
        variant: 'destructive'
      })
      
      // Se falhar e não houver membros, adicionar pelo menos o usuário atual
      if (members.length === 0 && fallbackUserId && user) {
        setMembers([{
          id: 'fallback',
          user_id: fallbackUserId,
          team_id: teamId,
          role: 'chefe-equipe',
          profile: {
            id: fallbackUserId,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
            avatar_url: user.user_metadata?.avatar_url
          }
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  // Efetuar a remoção do membro
  const removeMember = async (member: TeamMember) => {
    if (!member || !member.id || member.id === 'fallback') {
      toast({
        title: 'Operação inválida',
        description: 'Não é possível remover este membro',
        variant: 'destructive'
      })
      return
    }
    
    try {
      setLoading(true)
      
      // Não permitir remover a si mesmo (chefe da equipe)
      if (member.user_id === user?.id) {
        toast({
          title: 'Operação inválida',
          description: 'Você não pode remover a si mesmo da equipe',
          variant: 'destructive'
        })
        return
      }
      
      console.log('Removendo membro:', member)
      
      // Remover o membro
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', member.id)
      
      if (error) {
        console.error('Erro ao remover membro:', error)
        throw new Error(error.message)
      }
      
      // Atualizar UI após remoção bem-sucedida
      setMembers(members.filter(m => m.id !== member.id))
      
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da equipe com sucesso'
      })
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o membro. Tente novamente mais tarde.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      setMemberToRemove(null)
      setConfirmOpen(false)
    }
  }

  // Obter iniciais do nome para avatar
  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  // Formatar papel para exibição
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'promotor': 'Promotor',
      'promoter': 'Promotor',
      'chefe-equipe': 'Chefe de Equipe',
      'team-leader': 'Chefe de Equipe'
    }
    
    return roleMap[role.toLowerCase()] || role
  }

  // Efeito para carregar membros quando necessário
  useEffect(() => {
    if (initialMembers.length === 0) {
      refreshMembers()
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">{members.length} {members.length === 1 ? 'membro' : 'membros'}</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshMembers}
          disabled={loading}
        >
          {loading ? <LoadingSpinner size="sm" /> : 'Atualizar Lista'}
        </Button>
      </div>
      
      {loading && members.length === 0 ? (
        <div className="flex justify-center p-4">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="space-y-3">
          {members.length === 0 ? (
            <Card className="p-4 text-center text-muted-foreground">
              Nenhum membro encontrado na equipe
            </Card>
          ) : (
            members.map((member) => (
              <div 
                key={member.id} 
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage 
                      src={member.profile?.avatar_url || ''} 
                      alt={member.profile?.full_name || 'Membro'} 
                    />
                    <AvatarFallback>
                      {getInitials(member.profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {member.profile?.full_name || 'Usuário sem nome'}
                      {member.user_id === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(Você)</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.profile?.email || 'Email não disponível'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={member.role.includes('chefe') || member.role.includes('leader') ? 'default' : 'outline'}>
                    {formatRole(member.role)}
                  </Badge>
                  
                  {/* Mostrar botão de remover apenas se o usuário for chefe e não for o próprio usuário */}
                  {user?.user_metadata?.role?.includes('chefe') && 
                   member.user_id !== user.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setMemberToRemove(member)
                        setConfirmOpen(true)
                      }}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      
      {/* Diálogo de confirmação para remover membro */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover {memberToRemove?.profile?.full_name || 'este membro'} da equipe?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => memberToRemove && removeMember(memberToRemove)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 