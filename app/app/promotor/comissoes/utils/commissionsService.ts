import { createClient } from '@/lib/supabase/client'
import { Commission } from '../types/Commission'

const supabase = createClient()

// ✅ SERVIÇO: fetchCommissionsData (Complexidade: 2 pontos)
export const fetchCommissionsData = async (userId: string) => {
  const { data, error } = await supabase
    .from('commissions')
    .select(`
      id, promoter_amount, status, receipt_code, created_at,
      events (id, title, organizations (id, name)),
      teams (id, name)
    `)
    .eq('promoter_id', userId)
    .order('created_at', { ascending: false })

  if (error) { // +1
    throw new Error(error.message)
  }

  return data
}

// ✅ SERVIÇO: formatCommissionsData (Complexidade: 1 ponto)
export const formatCommissionsData = (data: any[]): Commission[] => {
  return data.map((item: any) => ({
    id: item.id,
    eventId: item.events?.id || '',
    eventName: item.events?.title || 'Evento não encontrado',
    organizationId: item.events?.organizations?.id || '',
    organizationName: item.events?.organizations?.name || 'Organização não encontrada',
    teamId: item.teams?.id || '',
    teamName: item.teams?.name || 'Equipe não encontrada',
    promoterId: item.promoter_id || '',
    amount: item.amount || 0,
    promoterAmount: item.promoter_amount || 0,
    teamAmount: item.team_amount || 0,
    status: item.status || 'pending',
    ticketId: item.ticket_id || '',
    createdAt: item.created_at,
    paymentDate: item.payment_date,
    receiptCode: item.receipt_code
  }))
}
