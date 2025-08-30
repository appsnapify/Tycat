import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchIcon, Calendar } from 'lucide-react'
import { CommissionFilter } from '../types/Commission'

interface DateSearchFiltersProps {
  filter: CommissionFilter
  setFilter: (filter: CommissionFilter) => void
}

// ✅ COMPONENTE: DateSearchFilters (Complexidade: 1 ponto)
export const DateSearchFilters = ({ filter, setFilter }: DateSearchFiltersProps) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="filter-start-date">Data Inicial</Label>
        <div className="relative">
          <Input
            id="filter-start-date" type="date" value={filter.startDate}
            onChange={(e) => setFilter({...filter, startDate: e.target.value})}
          />
          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-end-date">Data Final</Label>
        <div className="relative">
          <Input
            id="filter-end-date" type="date" value={filter.endDate}
            onChange={(e) => setFilter({...filter, endDate: e.target.value})}
          />
          <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="filter-search">Buscar</Label>
        <div className="relative">
          <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="filter-search" type="text" placeholder="Evento, organização..."
            className="pl-9" value={filter.search}
            onChange={(e) => setFilter({...filter, search: e.target.value})}
          />
        </div>
      </div>
    </>
  )
}
