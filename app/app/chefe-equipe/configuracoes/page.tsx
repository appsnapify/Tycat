"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  ArrowLeft, 
  User,
  Settings,
  Lock,
  Bell,
  Save,
  CreditCard,
  LogOut,
  ShieldAlert,
  Building,
  Trash2,
  Edit,
  Users
} from 'lucide-react'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'

interface EquipeSettings {
  nome: string
  descricao: string
  logo_url: string | null
}

interface UserSettings {
  email: string
  name: string
  notifications: {
    email: boolean
    browser: boolean
    marketing: boolean
  }
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const supabase = createClientComponentClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [equipeSettings, setEquipeSettings] = useState<EquipeSettings>({
    nome: '',
    descricao: '',
    logo_url: null
  })
  const [userSettings, setUserSettings] = useState<UserSettings>({
    email: '',
    name: '',
    notifications: {
      email: true,
      browser: true,
      marketing: false
    }
  })
  const [activeTab, setActiveTab] = useState('perfil')
  
  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])
  
  const loadSettings = async () => {
    setLoading(true)
    try {
      // Obter ID da equipe dos metadados do usuário
      const teamId = user?.user_metadata?.team_id
      
      if (!teamId) {
        console.error("ID da equipe não encontrado nos metadados")
        setLoading(false)
        return
      }
      
      setTeamId(teamId)
      
      // Buscar informações da equipe
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()
      
      if (teamError) {
        console.error("Erro ao buscar informações da equipe:", teamError)
        toast.error("Erro ao carregar configurações da equipe")
        
        // Carregar dados simulados em caso de erro
        setEquipeSettings({
          nome: 'Minha Equipe de Promotores',
          descricao: 'Equipe especializada em eventos musicais e culturais na região.',
          logo_url: null
        })
      } else if (teamData) {
        setEquipeSettings({
          nome: teamData.name || 'Minha Equipe de Promotores',
          descricao: teamData.description || 'Equipe especializada em eventos musicais e culturais na região.',
          logo_url: teamData.logo_url
        })
      }
      
      // Buscar preferências do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, notification_preferences')
        .eq('id', user.id)
        .single()
      
      if (profileError) {
        console.error("Erro ao buscar perfil do usuário:", profileError)
        toast.error("Erro ao carregar configurações do usuário")
        
        // Carregar dados básicos do usuário
        setUserSettings({
          email: user.email || '',
          name: user.user_metadata?.name || '',
          notifications: {
            email: true,
            browser: true,
            marketing: false
          }
        })
      } else if (profileData) {
        // Se temos preferências de notificação salvas, usá-las
        const notificationPrefs = profileData.notification_preferences || {}
        
        setUserSettings({
          email: user.email || '',
          name: profileData.full_name || user.user_metadata?.name || '',
          notifications: {
            email: notificationPrefs.email !== undefined ? notificationPrefs.email : true,
            browser: notificationPrefs.browser !== undefined ? notificationPrefs.browser : true,
            marketing: notificationPrefs.marketing !== undefined ? notificationPrefs.marketing : false
          }
        })
      }
      
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      toast.error('Erro ao carregar configurações')
      
      // Carregar dados padrão em caso de erro
      setEquipeSettings({
        nome: 'Minha Equipe de Promotores',
        descricao: 'Equipe especializada em eventos musicais e culturais na região.',
        logo_url: null
      })
      
      setUserSettings({
        email: user?.email || '',
        name: user?.user_metadata?.name || '',
        notifications: {
          email: true,
          browser: true,
          marketing: false
        }
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Atualizar perfil do usuário no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: userSettings.name,
          notification_preferences: userSettings.notifications,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (error) {
        throw error
      }
      
      // Atualizar metadados do usuário na sessão
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          name: userSettings.name
        }
      })
      
      if (updateError) {
        console.error("Erro ao atualizar metadados:", updateError)
      }
      
      toast.success('Perfil atualizado com sucesso')
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      toast.error('Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }
  
  const handleSaveTeam = async () => {
    setSaving(true)
    try {
      // Atualizar informações da equipe no Supabase
      const { error } = await supabase
        .from('teams')
        .update({ 
          name: equipeSettings.nome,
          description: equipeSettings.descricao,
          logo_url: equipeSettings.logo_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
      
      if (error) {
        throw error
      }
      
      toast.success('Configurações da equipe atualizadas com sucesso')
    } catch (error) {
      console.error('Erro ao salvar configurações da equipe:', error)
      toast.error('Erro ao salvar configurações da equipe')
    } finally {
      setSaving(false)
    }
  }
  
  const handleNotificationChange = (type: keyof UserSettings['notifications'], value: boolean) => {
    setUserSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [type]: value
      }
    }))
  }
  
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      toast.error('Erro ao fazer logout')
    }
  }
  
  if (loading) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-4">Configurações</h1>
        <p className="text-muted-foreground mb-8">
          Carregando suas configurações...
        </p>
        
        <div className="grid gap-4">
          <Card className="animate-pulse">
            <CardHeader className="h-12 bg-muted/40"></CardHeader>
            <CardContent className="p-6">
              <div className="h-64 bg-muted/40 rounded-md"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie suas configurações e preferências
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button variant="outline" onClick={() => router.push('/app/chefe-equipe/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
        {/* Navegação Lateral */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center py-4">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
                  <AvatarFallback>
                    {userSettings.name.split(' ').map(name => name[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-medium">{userSettings.name}</h2>
                <p className="text-sm text-muted-foreground">{userSettings.email}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                    Chefe de Equipe
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col space-y-1">
            <Button 
              variant={activeTab === 'perfil' ? 'default' : 'ghost'} 
              className="justify-start" 
              onClick={() => setActiveTab('perfil')}
            >
              <User className="mr-2 h-4 w-4" />
              Perfil
            </Button>
            <Button 
              variant={activeTab === 'equipe' ? 'default' : 'ghost'} 
              className="justify-start" 
              onClick={() => setActiveTab('equipe')}
            >
              <Users className="mr-2 h-4 w-4" />
              Equipe
            </Button>
            <Button 
              variant={activeTab === 'senha' ? 'default' : 'ghost'} 
              className="justify-start" 
              onClick={() => setActiveTab('senha')}
            >
              <Lock className="mr-2 h-4 w-4" />
              Senha e Segurança
            </Button>
            <Button 
              variant={activeTab === 'notificacoes' ? 'default' : 'ghost'} 
              className="justify-start" 
              onClick={() => setActiveTab('notificacoes')}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notificações
            </Button>
          </div>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start text-destructive" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Conteúdo Principal */}
        <div>
          {/* Perfil */}
          {activeTab === 'perfil' && (
            <Card>
              <CardHeader>
                <CardTitle>Informações do Perfil</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input 
                    id="name" 
                    placeholder="Seu nome" 
                    value={userSettings.name} 
                    onChange={(e) => setUserSettings(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    placeholder="Seu email" 
                    value={userSettings.email}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    O email é usado para login e não pode ser alterado
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Foto de Perfil</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={user?.user_metadata?.avatar_url || ''} />
                      <AvatarFallback>
                        {userSettings.name.split(' ').map(name => name[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" />
                        Alterar Foto
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t px-6 py-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Equipe */}
          {activeTab === 'equipe' && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações da Equipe</CardTitle>
                <CardDescription>
                  Personalize as informações da sua equipe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team-name">Nome da Equipe</Label>
                  <Input 
                    id="team-name" 
                    placeholder="Nome da sua equipe" 
                    value={equipeSettings.nome} 
                    onChange={(e) => setEquipeSettings(prev => ({ ...prev, nome: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="team-description">Descrição</Label>
                  <Textarea 
                    id="team-description" 
                    placeholder="Descreva sua equipe" 
                    rows={4}
                    value={equipeSettings.descricao} 
                    onChange={(e) => setEquipeSettings(prev => ({ ...prev, descricao: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Logo da Equipe</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 border rounded-md flex items-center justify-center bg-muted">
                      {equipeSettings.logo_url ? (
                        <img 
                          src={equipeSettings.logo_url} 
                          alt="Logo da equipe" 
                          className="max-h-full max-w-full" 
                        />
                      ) : (
                        <Building className="h-10 w-10 text-muted-foreground/40" />
                      )}
                    </div>
                    <div>
                      <Button variant="outline" size="sm" className="mb-2">
                        <Edit className="mr-2 h-4 w-4" />
                        Carregar Logo
                      </Button>
                      {equipeSettings.logo_url && (
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remover
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Configurações Avançadas</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Permitir Convites</Label>
                        <p className="text-sm text-muted-foreground">
                          Permite que novos membros entrem usando o código da equipe
                        </p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Visibilidade da Equipe</Label>
                        <p className="text-sm text-muted-foreground">
                          Controla quem pode ver sua equipe no sistema
                        </p>
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="organizations">Apenas Organizações</SelectItem>
                          <SelectItem value="members">Apenas Membros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t px-6 py-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSaveTeam} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Senha e Segurança */}
          {activeTab === 'senha' && (
            <Card>
              <CardHeader>
                <CardTitle>Senha e Segurança</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Senha Atual</Label>
                  <Input id="current-password" type="password" placeholder="Digite sua senha atual" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <Input id="new-password" type="password" placeholder="Digite uma nova senha" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirme sua nova senha" />
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Segurança da Conta</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Autenticação de Dois Fatores</Label>
                        <p className="text-sm text-muted-foreground">
                          Adicione uma camada extra de segurança à sua conta
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configurar
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Sessões Ativas</Label>
                        <p className="text-sm text-muted-foreground">
                          Gerencie os dispositivos conectados à sua conta
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Gerenciar
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t px-6 py-4">
                <Button variant="outline">Cancelar</Button>
                <Button>Alterar Senha</Button>
              </CardFooter>
            </Card>
          )}
          
          {/* Notificações */}
          {activeTab === 'notificacoes' && (
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificações</CardTitle>
                <CardDescription>
                  Personalize como você recebe notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Notificações por Email</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Atualizações da Equipe</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba emails quando houver mudanças na sua equipe
                        </p>
                      </div>
                      <Switch 
                        checked={userSettings.notifications.email}
                        onCheckedChange={(value) => handleNotificationChange('email', value)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Novos Eventos</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba emails sobre novos eventos disponíveis
                        </p>
                      </div>
                      <Switch checked={true} />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Pagamentos e Comissões</Label>
                        <p className="text-sm text-muted-foreground">
                          Notificações sobre pagamentos recebidos ou pendentes
                        </p>
                      </div>
                      <Switch checked={true} />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Notificações no Navegador</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Notificações em Tempo Real</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar notificações no navegador em tempo real
                        </p>
                      </div>
                      <Switch 
                        checked={userSettings.notifications.browser}
                        onCheckedChange={(value) => handleNotificationChange('browser', value)}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h3 className="text-lg font-medium">Comunicações de Marketing</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="font-medium">Novidades e Atualizações</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba emails sobre novos recursos e atualizações da plataforma
                        </p>
                      </div>
                      <Switch 
                        checked={userSettings.notifications.marketing}
                        onCheckedChange={(value) => handleNotificationChange('marketing', value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t px-6 py-4">
                <Button variant="outline">Restaurar Padrões</Button>
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Preferências'}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
} 