"use client"

import { Button } from '@/components/ui/button'
import { ArrowUp, FileDown } from 'lucide-react'
import { toast } from 'sonner'

// ✅ IMPORTS DOS COMPONENTES REFATORADOS
import { useCommissionsData } from './hooks/useCommissionsData'
import { CommissionsLoading } from './components/CommissionsLoading'
import { CommissionsSummaryCards } from './components/CommissionsSummaryCards'
import { CommissionsFilters } from './components/CommissionsFilters'
import { CommissionsTable } from './components/CommissionsTable'
import { exportCsv } from './utils/commissionUtils'

// ✅ COMPONENTE PRINCIPAL REFATORADO (Complexidade: 3 pontos)
export default function PromotorComissoesPage() {
  const {
    loading,
    commissions,
    filteredCommissions,
    filter,
    setFilter,
    teams,
    totals,
    loadCommissions,
    clearFilters
  } = useCommissionsData()

  const handleExportCsv = () => { // +1
    exportCsv(filteredCommissions)
    toast.success('Relatório exportado com sucesso')
  }

  if (loading) { // +1
    return <CommissionsLoading />
  }

  return ( // +1
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <h1 className="text-3xl font-bold">Comissões</h1>
        
        <div className="flex items-center mt-4 sm:mt-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => loadCommissions()}>
            <ArrowUp className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <FileDown className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      <CommissionsSummaryCards totals={totals} />
      
      <CommissionsFilters 
        filter={filter}
        setFilter={setFilter}
        teams={teams}
        clearFilters={clearFilters}
      />
      
      <CommissionsTable 
        filteredCommissions={filteredCommissions}
        commissions={commissions}
        clearFilters={clearFilters}
      />
    </div>
  )
}