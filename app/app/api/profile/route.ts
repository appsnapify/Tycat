// ✅ IMPORTS DOS UTILITÁRIOS REFATORADOS
import { authenticateUser } from './utils/profileAuth'
import { fetchUserProfile } from './utils/profileService'
import { createSuccessResponse, createErrorResponse } from './utils/responseHelpers'

/**
 * Manipula solicitações GET para obter o perfil do usuário atual
 * Documentação completa: ./docs/README.md
 */
// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 4 pontos)
export async function GET() {
  try { // +1
    const authResult = await authenticateUser()
    if (!authResult.success) { // +1
      return authResult.response
    }

    const { userId, supabase } = authResult
    const profileResult = await fetchUserProfile(supabase, userId)
    
    if (!profileResult.success) { // +1
      return profileResult.response
    }

    return createSuccessResponse(profileResult.data) // +1
  } catch (error) {
    return createErrorResponse(error)
  }
} 