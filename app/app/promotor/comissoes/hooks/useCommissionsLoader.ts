import { toast } from 'sonner'
import { Commission, CommissionTotals } from '../types/Commission'
import { calculateTotalsLogic } from '../utils/commissionUtils'
import { fetchCommissionsData, formatCommissionsData } from '../utils/commissionsService'

// ✅ HOOK ESPECÍFICO: useCommissionsLoader (Complexidade: 4 pontos)
export const useCommissionsLoader = () => {
  const loadCommissions = async (
    userId: string,
    setLoading: (loading: boolean) => void,
    setCommissions: (commissions: Commission[]) => void,
    setTotals: (totals: CommissionTotals) => void
  ) => {
    setLoading(true)
    try { // +1
      const data = await fetchCommissionsData(userId)

      if (!data) { // +1
        console.log('Nenhuma comissão encontrada')
        setCommissions([])
        setTotals({ all: 0, pending: 0, processing: 0, paid: 0, rejected: 0 })
        return
      }

      const formattedCommissions = formatCommissionsData(data)
      setCommissions(formattedCommissions)
      
      const totals = calculateTotalsLogic(formattedCommissions)
      setTotals(totals)
    } catch (err: any) { // +1
      console.error('Erro ao carregar comissões:', err)
      toast.error('Erro ao carregar comissões')
    } finally {
      setLoading(false)
    }
  }

  return { loadCommissions }
}