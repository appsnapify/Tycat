// ✅ TIPOS E INTERFACES (Complexidade: 1 ponto)
export interface Commission {
  id: string
  eventId: string
  eventName: string 
  organizationId: string
  organizationName: string
  teamId: string
  teamName: string
  promoterId: string
  amount: number
  promoterAmount: number
  teamAmount: number
  status: 'pending' | 'processing' | 'paid' | 'rejected'
  ticketId: string
  createdAt: string
  paymentDate?: string
  receiptCode?: string
}

export interface CommissionFilter {
  status: string
  team: string
  search: string
  startDate: string
  endDate: string
}

export interface CommissionTotals {
  all: number
  pending: number
  processing: number
  paid: number
  rejected: number
}
