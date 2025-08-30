import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Commission } from '../types/Commission'
import { EmptyCommissionsState } from './EmptyCommissionsState'
import { CommissionsTableContent } from './CommissionsTableContent'

interface CommissionsTableProps {
  filteredCommissions: Commission[]
  commissions: Commission[]
  clearFilters: () => void
}

// ✅ COMPONENTE: CommissionsTable (Complexidade: 1 ponto)
export const CommissionsTable = ({ 
  filteredCommissions, 
  commissions, 
  clearFilters 
}: CommissionsTableProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Comissões</CardTitle>
        <CardDescription>
          {filteredCommissions.length} {filteredCommissions.length === 1 ? 'comissão encontrada' : 'comissões encontradas'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {filteredCommissions.length === 0 ? ( // +1
          <EmptyCommissionsState commissions={commissions} clearFilters={clearFilters} />
        ) : (
          <CommissionsTableContent filteredCommissions={filteredCommissions} />
        )}
      </CardContent>
    </Card>
  )
}