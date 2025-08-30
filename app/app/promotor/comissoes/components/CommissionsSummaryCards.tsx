import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CommissionTotals } from '../types/Commission'
import { formatCurrency } from '../utils/commissionUtils'

interface CommissionsSummaryCardsProps {
  totals: CommissionTotals
}

// ✅ COMPONENTE DE CARDS DE RESUMO (Complexidade: 1 ponto)
export const CommissionsSummaryCards = ({ totals }: CommissionsSummaryCardsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pendente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.pending)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Aguardando pagamento
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Em Processamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.processing)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pagamentos sendo processados
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.paid)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Valor já recebido
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totals.all)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Todas as comissões
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
