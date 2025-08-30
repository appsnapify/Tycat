import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '../utils/commissionUtils'

interface SummaryCardProps {
  title: string
  value: number
  description: string
}

// ✅ COMPONENTE INDIVIDUAL DE CARD (Complexidade: 1 ponto)
export const SummaryCard = ({ title, value, description }: SummaryCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatCurrency(value)}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}
