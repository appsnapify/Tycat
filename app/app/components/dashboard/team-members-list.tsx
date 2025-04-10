"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/loading-spinner'
import { toast } from 'sonner'

// Tipo para membros da equipe
interface TeamMember {
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
  users?: {
    email?: string
    user_metadata?: any
  }
}

interface TeamMembersListProps {
  initialMembers: TeamMember[]
  teamId: string
  fallbackUserId?: string
}

// Função para normalizar papel
function normalizeRole(role: string | null | undefined): string {
  if (!role) return 'membro'
  
  const roleMap: Record<string, string> = {
    'promoter': 'promotor',
    'team-leader': 'chefe-equipe'
  }
  
  return roleMap[role.toLowerCase()] || role.toLowerCase()
}

// Função para obter nome do membro da equipe
function getMemberName(member: TeamMember): string {
  // Tentar obter nome do perfil
  if (member.profile?.full_name) {
    return member.profile.full_name
  }
  
  // Tentar obter nome dos metadados do usuário
  if (member.users?.user_metadata?.full_name) {
    return member.users.user_metadata.full_name
  }
  
  if (member.users?.user_metadata?.name) {
    return member.users.user_metadata.name
  }
  
  // Fallback para email ou ID
  return member.profile?.email || member.users?.email || `Usuário ${member.user_id.slice(0, 8)}`
}

// Função para obter email do membro da equipe
function getMemberEmail(member: TeamMember): string {
  return member.profile?.email || member.users?.email || 'Email não disponível'
}

// Função para obter URL do avatar
function getAvatarUrl(member: TeamMember): string | null {
  return member.profile?.avatar_url || 
    member.users?.user_metadata?.avatar_url || 
    null
}

// Função para obter iniciais para o fallback do avatar
function getInitials(member: TeamMember): string {
  const name = getMemberName(member)
  
  // Se o nome for um email, retornar as duas primeiras letras
  if (name.includes('@')) {
    return name.slice(0, 2).toUpperCase()
  }
  
  // Se for um ID, retornar as duas primeiras letras
  if (name.startsWith('Usuário')) {
    return name.slice(8, 10).toUpperCase()
  }
  
  // Tentar obter iniciais do nome completo
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  
  // Fallback para as duas primeiras letras do nome
  return name.slice(0, 2).toUpperCase()
}

export function TeamMembersList({ initialMembers, teamId, fallbackUserId }: TeamMembersListProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers || [])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  
  // Função para carregar membros
  const loadMembers = async () => {
    if (!teamId) {
      setError('ID da equipe não fornecido')
      return
    }
    
    setRefreshing(true)
    setError(null)
    
    try {
      console.log(`Carregando membros para equipe: ${teamId}`)
      
      // Primeiro tentar usar RPC
      const { data, error } = await supabase.rpc('get_team_members', {
        team_id_param: teamId
      })
      
      if (error) {
        console.error('Erro ao carregar membros via RPC:', error)
        
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
          throw new Error(`Não foi possível carregar os membros: ${directError.message}`)
        }
        
        // Remapear para formato esperado
        const processedMembers = directData.map(member => ({
          ...member,
          profile: {
            id: member.users?.id || member.user_id,
            email: member.users?.email,
            full_name: member.users?.user_metadata?.full_name || member.users?.user_metadata?.name,
            avatar_url: member.users?.user_metadata?.avatar_url
          }
        }))
        
        setMembers(processedMembers)
      } else {
        console.log(`${data.length} membros carregados via RPC`)
        setMembers(data)
      }
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
      setError('Falha ao carregar os membros da equipe. Tente novamente mais tarde.')
      
      // Usar dados iniciais como fallback
      if (initialMembers?.length > 0) {
        setMembers(initialMembers)
      } else if (fallbackUserId) {
        // Criar membro fallback
        setMembers([{
          id: 'fallback',
          user_id: fallbackUserId,
          team_id: teamId,
          role: 'chefe-equipe',
          joined_at: new Date().toISOString(),
          profile: {
            id: fallbackUserId,
            full_name: 'Líder da Equipe',
            email: 'Email não disponível'
          }
        }])
      }
    } finally {
      setRefreshing(false)
    }
  }
  
  // Atualizar papel do membro
  const updateMemberRole = async (memberId: string, userId: string, newRole: string) => {
    try {
      setLoading(true)
      
      // Verificar se é uma string válida para o papel
      if (!['promotor', 'chefe-equipe'].includes(newRole)) {
        toast.error('Papel inválido')
        return
      }
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('team_members')
        .update({ role: newRole })
        .eq('id', memberId)
      
      if (error) {
        console.error('Erro ao atualizar papel:', error)
        toast.error('Não foi possível atualizar o papel do membro')
        return
      }
      
      // Atualizar também nos metadados do usuário (para persistência)
      await supabase.rpc('update_user_metadata_role', {
        user_id_param: userId,
        new_role: newRole
      })
      
      // Atualizar estado local
      setMembers(members.map(member => 
        member.id === memberId ? { ...member, role: newRole } : member
      ))
      
      toast.success('Papel atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao atualizar papel:', error)
      toast.error('Falha ao atualizar papel')
    } finally {
      setLoading(false)
    }
  }
  
  // Remover membro
  const removeMember = async (memberId: string, userId: string) => {
    if (!confirm('Tem certeza que deseja remover este membro da equipe?')) {
      return
    }
    
    try {
      setLoading(true)
      
      // Remover do banco de dados
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)
      
      if (error) {
        console.error('Erro ao remover membro:', error)
        toast.error('Não foi possível remover o membro')
        return
      }
      
      // Tentar atualizar metadados do usuário removido para devolver ao papel de promotor
      await supabase.rpc('update_user_metadata_role', {
        user_id_param: userId,
        new_role: 'promotor'
      })
      
      // Atualizar estado local
      setMembers(members.filter(member => member.id !== memberId))
      
      toast.success('Membro removido com sucesso')
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      toast.error('Falha ao remover membro')
    } finally {
      setLoading(false)
    }
  }
  
  // Renderizar lista vazia
  if (!members || members.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-muted-foreground">Nenhum membro encontrado</p>
        <Button 
          variant="outline" 
          onClick={loadMembers} 
          className="mt-4"
          disabled={refreshing}
        >
          {refreshing ? <LoadingSpinner size="sm" /> : 'Tentar novamente'}
        </Button>
      </div>
    )
  }
  
  // Renderizar erro
  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-500">{error}</p>
        <Button 
          variant="outline" 
          onClick={loadMembers} 
          className="mt-4"
          disabled={refreshing}
        >
          {refreshing ? <LoadingSpinner size="sm" /> : 'Tentar novamente'}
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {refreshing && (
        <div className="flex items-center justify-center p-2">
          <LoadingSpinner size="sm" />
          <span className="ml-2 text-sm text-muted-foreground">Atualizando...</span>
        </div>
      )}
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <Card key={member.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={getAvatarUrl(member) || ''} alt={getMemberName(member)} />
                  <AvatarFallback>{getInitials(member)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{getMemberName(member)}</p>
                    <Badge variant={normalizeRole(member.role) === 'chefe-equipe' ? 'default' : 'outline'}>
                      {normalizeRole(member.role) === 'chefe-equipe' ? 'Chefe de Equipe' : 'Promotor'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{getMemberEmail(member)}</p>
                  <div className="flex mt-2 gap-2">
                    {normalizeRole(member.role) !== 'chefe-equipe' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => updateMemberRole(member.id, member.user_id, 'chefe-equipe')}
                        disabled={loading}
                      >
                        Promover
                      </Button>
                    )}
                    {normalizeRole(member.role) === 'chefe-equipe' && normalizeRole(member.role) !== 'promotor' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => updateMemberRole(member.id, member.user_id, 'promotor')}
                        disabled={loading}
                      >
                        Rebaixar
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => removeMember(member.id, member.user_id)}
                      disabled={loading}
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="flex justify-center mt-4">
        <Button
          variant="outline"
          onClick={loadMembers}
          disabled={refreshing}
        >
          {refreshing ? <LoadingSpinner size="sm" /> : 'Atualizar'}
        </Button>
      </div>
    </div>
  )
} 