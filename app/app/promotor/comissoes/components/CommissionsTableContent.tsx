import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Commission } from '../types/Commission'
import { formatCurrency, formatDate, getStatusText, getStatusVariant } from '../utils/commissionUtils'

interface CommissionsTableContentProps {
  filteredCommissions: Commission[]
}

// ✅ COMPONENTE: CommissionsTableContent (Complexidade: 1 ponto)
export const CommissionsTableContent = ({ 
  filteredCommissions 
}: CommissionsTableContentProps) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Organização</TableHead>
            <TableHead>Equipe</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Código</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredCommissions.map((commission) => (
            <TableRow key={commission.id}>
              <TableCell>{formatDate(commission.createdAt)}</TableCell>
              <TableCell className="font-medium">{commission.eventName}</TableCell>
              <TableCell>{commission.organizationName}</TableCell>
              <TableCell>{commission.teamName}</TableCell>
              <TableCell className="font-medium">{formatCurrency(commission.amount)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(commission.status)}>
                  {getStatusText(commission.status)}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{commission.receiptCode}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
