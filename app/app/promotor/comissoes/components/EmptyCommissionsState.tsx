import { Button } from '@/components/ui/button'
import { CreditCard } from 'lucide-react'

interface EmptyCommissionsStateProps {
  commissions: any[]
  clearFilters: () => void
}

// ✅ COMPONENTE: EmptyCommissionsState (Complexidade: 2 pontos)
export const EmptyCommissionsState = ({ 
  commissions, 
  clearFilters 
}: EmptyCommissionsStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">Nenhuma comissão encontrada</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {commissions.length > 0  // +1
          ? 'Ajuste os filtros para ver suas comissões.' 
          : 'Você ainda não tem comissões geradas. Quando suas vendas gerarem comissões, elas aparecerão aqui.'}
      </p>
      {commissions.length > 0 && ( // +1
        <Button variant="outline" className="mt-4" onClick={clearFilters}>
          Limpar Filtros
        </Button>
      )}
    </div>
  )
}
