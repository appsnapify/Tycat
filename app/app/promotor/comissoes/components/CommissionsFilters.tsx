import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchIcon, Calendar } from 'lucide-react'
import { CommissionFilter } from '../types/Commission'

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="filter-start-date">Data Inicial</Label>
            <div className="relative">
              <Input
                id="filter-start-date"
                type="date"
                value={filter.startDate}
                onChange={(e) => setFilter({...filter, startDate: e.target.value})}
              />
              <Calendar className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="filter-end-date">Data Final</Label>
            <div className="relative">
              <Input
                id="filter-end-date"
                type="date"
                value={filter.endDate}
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
                id="filter-search"
                type="text"
                placeholder="Evento, organização..."
                className="pl-9"
                value={filter.search}
                onChange={(e) => setFilter({...filter, search: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
