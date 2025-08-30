import { CommissionTotals } from '../types/Commission'
import { SummaryCard } from './SummaryCard'

interface CommissionsSummaryCardsProps {
  totals: CommissionTotals
}

// ✅ CONFIGURAÇÃO DE CARDS (Complexidade: 1 ponto)
const SUMMARY_CARDS = [
  {
    key: 'pending',
    title: 'Total Pendente',
    description: 'Aguardando pagamento'
  },
  {
    key: 'processing', 
    title: 'Em Processamento',
    description: 'Pagamentos sendo processados'
  },
  {
    key: 'paid',
    title: 'Total Pago', 
    description: 'Valor já recebido'
  },
  {
    key: 'all',
    title: 'Total Geral',
    description: 'Todas as comissões'
  }
] as const

// ✅ COMPONENTE DE CARDS DE RESUMO REFATORADO (Complexidade: 1 ponto)
export const CommissionsSummaryCards = ({ totals }: CommissionsSummaryCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {SUMMARY_CARDS.map(card => (
        <SummaryCard
          key={card.key}
          title={card.title}
          value={totals[card.key]}
          description={card.description}
        />
      ))}
    </div>
  )
}
