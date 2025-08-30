import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CommissionFilter } from '../types/Commission'
import { FilterInputs } from './FilterInputs'

interface CommissionsFiltersProps {
  filter: CommissionFilter
  setFilter: (filter: CommissionFilter) => void
  teams: {id: string, name: string}[]
  clearFilters: () => void
}

// ✅ COMPONENTE DE FILTROS (Complexidade: 1 ponto)
export const CommissionsFilters = ({ 
  filter, 
  setFilter, 
  teams, 
  clearFilters 
}: CommissionsFiltersProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Filtros</CardTitle>
        <CardDescription>
          Filtre suas comissões por status, equipe, período ou texto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FilterInputs filter={filter} setFilter={setFilter} teams={teams} />
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}