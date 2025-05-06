import { createReadOnlyClient } from '@/lib/supabase-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import LoginForm from '@/app/components/LoginForm'
import UserProfileActions from './actions'

// Esta é uma página Server Component, que deve usar createReadOnlyClient
// para ler dados sem modificar cookies

export default async function ProfilePage() {
  // Usar o cliente somente leitura para verificar a sessão e carregar dados
  const supabase = await createReadOnlyClient()
  
  // Verificar se o usuário está logado
  const { data: { session } } = await supabase.auth.getSession()
  
  // Carregar dados públicos (pode ser feito mesmo sem autenticação)
  const { data: publicEvents } = await supabase
    .from('events')
    .select('id, name, venue, start_date, status')
    .eq('status', 'active')
    .order('start_date', { ascending: true })
    .limit(5)
  
  // Se o usuário estiver logado, carregar também seus dados privados
  let userData = null
  let userEvents = null
  
  if (session?.user?.id) {
    // Carregar dados do perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    
    userData = profile
    
    // Carregar eventos do usuário
    const { data: events } = await supabase
      .from('events')
      .select('id, name, venue, start_date, status')
      .eq('user_id', session.user.id)
      .order('start_date', { ascending: false })
    
    userEvents = events
  }
  
  return (
    <div className="container mx-auto py-10 space-y-8">
      <h1 className="text-3xl font-bold">Perfil do Usuário</h1>
      
      {/* Mostrar conteúdo baseado no estado de autenticação */}
      {session ? (
        <ProfileContent 
          userData={userData} 
          userEvents={userEvents} 
          publicEvents={publicEvents} 
          userId={session.user.id}
        />
      ) : (
        <GuestContent publicEvents={publicEvents} />
      )}
    </div>
  )
}

// Componente para usuários logados
function ProfileContent({ 
  userData, 
  userEvents, 
  publicEvents,
  userId
}: { 
  userData: any; 
  userEvents: any[]; 
  publicEvents: any[];
  userId: string;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seus Dados</CardTitle>
          <CardDescription>Informações do seu perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Nome:</strong> {userData?.first_name} {userData?.last_name}</p>
            <p><strong>Email:</strong> {userData?.email}</p>
            <p><strong>Telefone:</strong> {userData?.phone}</p>
          </div>
          
          {/* Formulário de atualização usando Server Action */}
          <UserProfileActions userId={userId} userData={userData} />
        </CardContent>
      </Card>
      
      <Tabs defaultValue="your-events">
        <TabsList>
          <TabsTrigger value="your-events">Seus Eventos</TabsTrigger>
          <TabsTrigger value="public-events">Eventos Públicos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="your-events">
          <Card>
            <CardHeader>
              <CardTitle>Seus Eventos</CardTitle>
              <CardDescription>Eventos que você criou ou participa</CardDescription>
            </CardHeader>
            <CardContent>
              {userEvents?.length > 0 ? (
                <div className="space-y-4">
                  {userEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <p>Você ainda não tem eventos.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="public-events">
          <Card>
            <CardHeader>
              <CardTitle>Eventos Públicos</CardTitle>
              <CardDescription>Eventos disponíveis para todos</CardDescription>
            </CardHeader>
            <CardContent>
              {publicEvents?.length > 0 ? (
                <div className="space-y-4">
                  {publicEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <p>Não há eventos públicos no momento.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componente para visitantes não logados
function GuestContent({ publicEvents }: { publicEvents: any[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Faça Login</CardTitle>
          <CardDescription>Entre para ver seu perfil e gerenciar seus eventos</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirectPath="/profile" />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Eventos Públicos</CardTitle>
          <CardDescription>Eventos disponíveis para todos</CardDescription>
        </CardHeader>
        <CardContent>
          {publicEvents?.length > 0 ? (
            <div className="space-y-4">
              {publicEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p>Não há eventos públicos no momento.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Componente para exibir um evento
function EventCard({ event }: { event: any }) {
  const date = new Date(event.start_date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{event.name}</h3>
      <p className="text-sm text-gray-500">{event.venue} • {date}</p>
    </div>
  )
} 