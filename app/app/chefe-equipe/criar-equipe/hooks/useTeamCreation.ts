import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { toast } from 'sonner'
import { useTeamOperations } from './useTeamOperations'

// ✅ HOOK: Team Creation UI Logic (Complexidade: 6 pontos)
export const useTeamCreation = () => {
  const router = useRouter()
  const { user, updateUserRole } = useAuth()
  const { createTeam, updateUserMetadata } = useTeamOperations()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ✅ FUNÇÃO: Validar formulário (Complexidade: 2 pontos)
  const validateForm = (teamName: string) => {
    if (!teamName.trim()) {                    // +1
      setError('Por favor, insira o nome da equipa.')
      return false
    }
    
    if (!user) {                               // +1
      setError('Utilizador não autenticado. Por favor, faça login novamente.')
      return false
    }
    
    return true
  }

  // ✅ FUNÇÃO: Manipular sucesso (Complexidade: 1 ponto)
  const handleSuccess = () => {
    updateUserRole('team-leader')
    
    setTimeout(() => {
      toast.success('Equipa criada com sucesso! Você agora é um Chefe de Equipe.')
      
      setTimeout(() => {
        router.push('/app/chefe-equipe/dashboard')
      }, 100)
    }, 100)
  }

  // ✅ FUNÇÃO: Manipular erro (Complexidade: 2 pontos)
  const handleError = (error: unknown) => {
    console.error('Erro ao criar equipa:', error)
    const errorMsg = error instanceof Error    // +1
      ? `Erro: ${error.message}` 
      : 'Ocorreu um erro desconhecido ao criar a equipa. Tente novamente.'
    
    setTimeout(() => {
      setError(errorMsg)
      setLoading(false)
    }, 0)
  }

  // ✅ FUNÇÃO: Submit principal (Complexidade: 4 pontos)
  const submitTeamCreation = async (teamName: string, teamDescription: string) => {
    if (!validateForm(teamName)) return       // +1
    
    setError('')
    setLoading(true)
    
    try {                                     // +1
      const teamId = await createTeam(teamName, teamDescription)
      await updateUserMetadata(teamId)
      
      setTimeout(() => {
        handleSuccess()
        setLoading(false)
      }, 100)
      
    } catch (error) {                         // +1
      handleError(error)
      return
    }
  }

  return {
    loading,
    error,
    submitTeamCreation
  }
}
