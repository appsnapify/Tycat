import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { UserPlus, ShoppingBag, Calendar, AlertCircle, User } from 'lucide-react'

/**
 * Interface para um item de atividade no feed
 */
export interface ActivityItem {
  id: string
  type: 'member_joined' | 'event_created' | 'event_updated' | 'sales_completed' | 'team_created' | 'other'
  user: {
    name: string
    avatar: string | null
  }
  timestamp: string
  data?: any
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  emptyMessage?: string
  maxItems?: number
}

/**
 * Componente para exibir um feed de atividades recentes
 */
export function ActivityFeed({ 
  activities,
  emptyMessage = "Nenhuma atividade recente para exibir",
  maxItems = 5
}: ActivityFeedProps) {
  // Se não houver atividades, exibir mensagem
  if (!activities || activities.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <AlertCircle className="mx-auto h-8 w-8 mb-2 text-muted-foreground/60" />
        <p>{emptyMessage}</p>
      </div>
    )
  }
  
  // Limitar o número de atividades exibidas
  const displayActivities = activities.slice(0, maxItems)
  
  return (
    <div className="space-y-4">
      {displayActivities.map((activity) => (
        <ActivityEntry key={activity.id} activity={activity} />
      ))}
    </div>
  )
}

/**
 * Componente para um item individual de atividade
 */
function ActivityEntry({ activity }: { activity: ActivityItem }) {
  // Obter o ícone apropriado para o tipo de atividade
  const getIcon = () => {
    switch (activity.type) {
      case 'member_joined':
        return <UserPlus className="h-4 w-4" />
      case 'event_created':
      case 'event_updated':
        return <Calendar className="h-4 w-4" />
      case 'sales_completed':
        return <ShoppingBag className="h-4 w-4" />
      case 'team_created':
        return <User className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }
  
  // Obter a descrição apropriada para o tipo de atividade
  const getDescription = () => {
    switch (activity.type) {
      case 'member_joined':
        return `${activity.user.name} ingressou na equipe como ${activity.data?.role || 'promotor'}`
      case 'event_created':
        return `Evento "${activity.data?.eventName || 'Novo evento'}" foi criado`
      case 'event_updated':
        return `Evento "${activity.data?.eventName || 'Evento'}" foi atualizado`
      case 'sales_completed':
        return `${activity.user.name} realizou ${activity.data?.quantity || 0} ${parseInt(activity.data?.quantity || 0) === 1 ? 'venda' : 'vendas'}`
      case 'team_created':
        return `Equipe foi criada por ${activity.user.name}`
      default:
        return `Atividade de ${activity.user.name}`
    }
  }
  
  // Formatar a data relativa (exemplo: "há 2 horas")
  const getFormattedTime = () => {
    try {
      return formatDistanceToNow(new Date(activity.timestamp), {
        addSuffix: true,
        locale: ptBR
      })
    } catch (error) {
      console.error('Erro ao formatar data:', error)
      return 'data desconhecida'
    }
  }
  
  return (
    <div className="flex items-start space-x-3">
      {/* Avatar ou ícone */}
      <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
        {getIcon()}
      </div>
      
      {/* Conteúdo */}
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">
          {getDescription()}
        </p>
        
        {/* Informações adicionais específicas do tipo */}
        {activity.type === 'sales_completed' && activity.data?.amount && (
          <p className="text-xs text-muted-foreground">
            Valor: {new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(activity.data.amount)}
          </p>
        )}
        
        {activity.type === 'event_created' && activity.data?.eventDate && (
          <p className="text-xs text-muted-foreground">
            Data: {new Date(activity.data.eventDate).toLocaleDateString('pt-PT')}
          </p>
        )}
        
        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">
          {getFormattedTime()}
        </p>
      </div>
    </div>
  )
} 