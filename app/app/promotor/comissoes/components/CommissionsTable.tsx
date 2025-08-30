import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CreditCard } from 'lucide-react'
import { Commission } from '../types/Commission'
import { formatCurrency, formatDate, getStatusText, getStatusVariant } from '../utils/commissionUtils'

interface CommissionsTableProps {
  filteredCommissions: Commission[]
  commissions: Commission[]
  clearFilters: () => void
}

// ✅ COMPONENTE DE TABELA (Complexidade: 3 pontos)
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
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recibo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map(commission => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">{formatDate(commission.createdAt)}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={commission.eventName}>
                        {commission.eventName}
                      </div>
                      <div className="text-xs text-muted-foreground">{commission.organizationName}</div>
                    </TableCell>
                    <TableCell>{commission.teamName}</TableCell>
                    <TableCell>{formatCurrency(commission.promoterAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(commission.status)}>
                        {getStatusText(commission.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {commission.receiptCode ? (
                        <div className="font-mono text-xs">{commission.receiptCode}</div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
