"use client"

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/app/app/_providers/auth-provider'

interface Team {
  id: string
  name: string
  team_code: string
  created_at: string
  organization_id: string
  created_by: string
}

export default function TeamConfigPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')

  const teamId = params.id as string

  useEffect(() => {
    if (user && teamId) {
      loadTeam()
    }
  }, [user, teamId])

  const loadTeam = async () => {
    try {
      setLoading(true)
      
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (teamError) {
        console.error('Erro ao carregar equipe:', teamError)
        toast.error('Erro ao carregar dados da equipe')
        router.push('/app/organizador/equipes')
        return
      }

      if (!teamData) {
        toast.error('Equipe não encontrada')
        router.push('/app/organizador/equipes')
        return
      }

      const { data: userOrg, error: orgError } = await supabase
        .from('user_organizations')
        .select('role')
        .eq('user_id', user?.id)
        .eq('organization_id', teamData.organization_id)
        .single()

      if (orgError || !userOrg || !['owner', 'admin'].includes(userOrg.role)) {
        toast.error('Você não tem permissão para editar esta equipe')
        router.push('/app/organizador/equipes')
        return
      }

      setTeam(teamData)
      setTeamName(teamData.name)
      
    } catch (error) {
      console.error('Erro ao carregar equipe:', error)
      toast.error('Erro inesperado ao carregar equipe')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!team || !teamName.trim()) {
      toast.error('Nome da equipe é obrigatório')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('teams')
        .update({
          name: teamName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', team.id)

      if (error) {
        console.error('Erro ao atualizar equipe:', error)
        toast.error('Erro ao salvar alterações')
        return
      }

      toast.success('Equipe atualizada com sucesso!')
      setTeam({ ...team, name: teamName.trim() })
      
    } catch (error) {
      console.error('Erro ao salvar equipe:', error)
      toast.error('Erro inesperado ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    router.push('/app/organizador/equipes')
  }

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-lime-500 border-t-transparent rounded-full"></div>
            <h3 className="text-xl font-medium">Carregando configurações...</h3>
          </div>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4">Equipe não encontrada</h3>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar às Equipes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-8">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Configurações da Equipe</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as configurações de "{team.name}"
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Configure as informações principais da equipe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team-name">Nome da Equipe</Label>
              <Input
                id="team-name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Digite o nome da equipe"
              />
            </div>
            
            <div>
              <Label>Código da Equipe</Label>
              <Input
                value={team.team_code}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground mt-1">
                O código da equipe não pode ser alterado
              </p>
            </div>

            <div>
              <Label>Data de Criação</Label>
              <Input
                value={new Date(team.created_at).toLocaleDateString('pt-PT')}
                disabled
                className="bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>
              Salve as alterações ou gerencie a equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Button 
                onClick={handleSave}
                disabled={saving || teamName.trim() === team.name}
                className="bg-lime-500 hover:bg-lime-600 text-white"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
              
              <Button variant="outline" onClick={handleBack}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 