import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CommissionFilter } from '../types/Commission'

interface StatusTeamFiltersProps {
  filter: CommissionFilter
  setFilter: (filter: CommissionFilter) => void
  teams: {id: string, name: string}[]
}

// ✅ COMPONENTE: StatusTeamFilters (Complexidade: 1 ponto)
export const StatusTeamFilters = ({ filter, setFilter, teams }: StatusTeamFiltersProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="filter-status">Status</Label>
        <Select value={filter.status} onValueChange={(value) => setFilter({...filter, status: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="processing">Em processamento</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="rejected">Rejeitado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="filter-team">Equipe</Label>
        <Select value={filter.team} onValueChange={(value) => setFilter({...filter, team: value})}>
          <SelectTrigger>
            <SelectValue placeholder="Todas as equipes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {teams.map(team => (
              <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )
}
