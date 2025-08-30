import { CommissionFilter } from '../types/Commission'
import { StatusTeamFilters } from './StatusTeamFilters'
import { DateSearchFilters } from './DateSearchFilters'

interface FilterInputsProps {
  filter: CommissionFilter
  setFilter: (filter: CommissionFilter) => void
  teams: {id: string, name: string}[]
}

// ✅ COMPONENTE: FilterInputs (Complexidade: 1 ponto)
export const FilterInputs = ({ filter, setFilter, teams }: FilterInputsProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatusTeamFilters filter={filter} setFilter={setFilter} teams={teams} />
      <DateSearchFilters filter={filter} setFilter={setFilter} />
    </div>
  )
}