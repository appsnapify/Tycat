import React from 'react';
import { Users, ShoppingBag, Calendar, AlertCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export interface ActivityItem {
  id: string;
  type: 'member_joined' | 'sale_completed' | 'event_created' | string;
  timestamp: string;
  data: Record<string, any>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  emptyMessage?: string;
  limit?: number;
}

export function ActivityFeed({ 
  activities, 
  emptyMessage = "Nenhuma atividade recente", 
  limit = 5 
}: ActivityFeedProps) {
  // Renderizar o ícone correto baseado no tipo de atividade
  const renderIcon = (type: string) => {
    switch (type) {
      case 'member_joined':
        return <Users className="h-5 w-5 text-blue-500" />;
      case 'sale_completed':
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      case 'event_created':
        return <Calendar className="h-5 w-5 text-purple-500" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />;
    }
  };

  // Renderizar a mensagem baseada no tipo de atividade e dados
  const renderMessage = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'member_joined':
        return (
          <span>
            <span className="font-medium">{activity.data.name || 'Um utilizador'}</span> juntou-se à equipa
          </span>
        );
      case 'sale_completed':
        return (
          <span>
            <span className="font-medium">{activity.data.quantity || '0'} bilhetes</span> vendidos por {activity.data.amount ? `${activity.data.amount}€` : '0€'}
          </span>
        );
      case 'event_created':
        return (
          <span>
            Evento <span className="font-medium">{activity.data.eventName || 'Novo evento'}</span> criado
          </span>
        );
      default:
        return <span>Atividade registada</span>;
    }
  };

  // Formatar a data relativa (ex: "há 2 dias")
  const formatTimeAgo = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { 
        addSuffix: true,
        locale: pt
      });
    } catch (e) {
      return "data desconhecida";
    }
  };

  // Formatar data completa para tooltip
  const formatFullDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: pt });
    } catch (e) {
      return "data desconhecida";
    }
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <AlertCircle className="h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.slice(0, limit).map(activity => (
        <div key={activity.id} className="flex items-start gap-3">
          <div className="mt-0.5 bg-muted rounded-full p-1.5">
            {renderIcon(activity.type)}
          </div>
          <div className="space-y-1">
            <p className="text-sm">
              {renderMessage(activity)}
            </p>
            <p 
              className="text-xs text-muted-foreground"
              title={formatFullDate(activity.timestamp)}
            >
              {formatTimeAgo(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 