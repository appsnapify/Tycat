import { Commission } from '../types/Commission'

// ✅ FUNÇÃO UTILITÁRIA: getStatusText (Complexidade: 4 pontos)
export const getStatusText = (status: string): string => {
  if (status === 'pending') return 'Pendente'           // +1
  if (status === 'processing') return 'Em processamento' // +1
  if (status === 'paid') return 'Pago'                  // +1
  if (status === 'rejected') return 'Rejeitado'         // +1
  return 'Pendente'
}

// ✅ FUNÇÃO UTILITÁRIA: getStatusVariant (Complexidade: 4 pontos)
export const getStatusVariant = (status: string): "outline" | "secondary" | "success" | "destructive" => {
  if (status === 'pending') return 'outline'      // +1
  if (status === 'processing') return 'secondary' // +1
  if (status === 'paid') return 'success'         // +1
  if (status === 'rejected') return 'destructive' // +1
  return 'outline'
}

// ✅ FUNÇÃO UTILITÁRIA: formatCurrency (Complexidade: 1 ponto)
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-PT', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(value)
}

// ✅ FUNÇÃO UTILITÁRIA: formatDate (Complexidade: 1 ponto)
export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// ✅ FUNÇÃO UTILITÁRIA: exportCsv (Complexidade: 3 pontos)
export const exportCsv = (filteredCommissions: Commission[]) => {
  const headers = ['Data', 'Evento', 'Organização', 'Equipe', 'Valor', 'Status', 'Código de Recibo']
  
  const csvData = filteredCommissions.map(commission => [
    new Date(commission.createdAt).toLocaleDateString('pt-PT'),
    commission.eventName,
    commission.organizationName,
    commission.teamName,
    commission.promoterAmount.toFixed(2).replace('.', ','),
    commission.status === 'pending' ? 'Pendente' : 
      commission.status === 'processing' ? 'Em processamento' : 
      commission.status === 'paid' ? 'Pago' : 'Rejeitado',
    commission.receiptCode || ''
  ])
  
  csvData.unshift(headers)
  
  const csvContent = csvData.map(row => row.join(';')).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `comissoes_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ✅ FUNÇÃO AUXILIAR: calculateTotalsLogic (Complexidade: 5 pontos)
export const calculateTotalsLogic = (commissions: Commission[]) => {
  const newTotals = {
    all: 0,
    pending: 0,
    processing: 0,
    paid: 0,
    rejected: 0
  }
  
  commissions.forEach(commission => {
    newTotals.all += commission.promoterAmount
    
    if (commission.status === 'pending') { // +1
      newTotals.pending += commission.promoterAmount
    } else if (commission.status === 'processing') { // +1
      newTotals.processing += commission.promoterAmount
    } else if (commission.status === 'paid') { // +1
      newTotals.paid += commission.promoterAmount
    } else if (commission.status === 'rejected') { // +1
      newTotals.rejected += commission.promoterAmount
    }
  })
  
  return newTotals
}

// ✅ FUNÇÃO AUXILIAR: applyFiltersLogic (Complexidade: 8 pontos)
export const applyFiltersLogic = (commissions: Commission[], filter: any) => {
  let filtered = [...commissions]
  
  if (filter.status !== 'all') { // +1
    filtered = filtered.filter(commission => commission.status === filter.status)
  }
  
  if (filter.team !== 'all') { // +1
    filtered = filtered.filter(commission => commission.teamId === filter.team)
  }
  
  if (filter.search) { // +1
    const searchLower = filter.search.toLowerCase()
    filtered = filtered.filter(commission => 
      commission.eventName.toLowerCase().includes(searchLower) ||
      commission.organizationName.toLowerCase().includes(searchLower) ||
      commission.receiptCode?.toLowerCase().includes(searchLower)
    )
  }
  
  if (filter.startDate) { // +1
    const startDate = new Date(filter.startDate)
    filtered = filtered.filter(commission => {
      const commissionDate = new Date(commission.createdAt)
      return commissionDate >= startDate
    })
  }
  
  if (filter.endDate) { // +1
    const endDate = new Date(filter.endDate)
    endDate.setHours(23, 59, 59, 999)
    filtered = filtered.filter(commission => {
      const commissionDate = new Date(commission.createdAt)
      return commissionDate <= endDate
    })
  }
  
  return filtered
}
