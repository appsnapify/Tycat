/**
 * FUNÇÃO CENTRALIZADA DE REDIRECIONAMENTO BASEADO EM ROLE
 * 
 * Esta função garante que cada usuário seja sempre redirecionado
 * para a área correta baseada no seu role, evitando cross-contamination.
 */

export interface UserMetadata {
  role?: string
  team_id?: string
  organization_id?: string
  is_team_leader?: boolean
  team_role?: string
}

/**
 * Normaliza o role do usuário para consistência
 */
export const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return 'desconhecido'
  
  const roleMappings: Record<string, string> = {
    'promoter': 'promotor',
    'team-leader': 'chefe-equipe',
    'chefe-equipe': 'chefe-equipe',
    'organizador': 'organizador',
    'organizer': 'organizador'
  }
  
  const roleLower = role.toLowerCase()
  return roleMappings[roleLower] || role
}

/**
 * Determina a URL de redirecionamento baseada no role do usuário
 */
export const getRoleRedirectUrl = (role: string, userMetadata?: UserMetadata): string => {
  const normalizedRole = normalizeRole(role)
  
  console.log('[ROLE-REDIRECT] Role:', normalizedRole, 'Metadata:', userMetadata)
  
  switch (normalizedRole) {
    case 'organizador':
      return '/app/organizador/dashboard'
    
    case 'chefe-equipe':
      return '/app/chefe-equipe/dashboard'
    
    case 'promotor':
      // Se tem equipe, vai para dashboard, senão para escolha de equipes
      if (userMetadata?.team_id) {
        return '/app/promotor/dashboard'
      }
      return '/app/promotor/equipes/escolha'
    
    default:
      console.warn('[ROLE-REDIRECT] Role desconhecido:', role)
      return '/app'
  }
}

/**
 * Verifica se o usuário tem permissão para acessar uma determinada rota
 */
export const hasRoutePermission = (userRole: string, requestedPath: string): boolean => {
  const normalizedRole = normalizeRole(userRole)
  const pathSegments = requestedPath.split('/')
  const requestedRole = pathSegments[2] // /app/[role]/...
  
  // Se não é uma rota de role específico, permitir
  if (!requestedRole || !['organizador', 'chefe-equipe', 'promotor'].includes(requestedRole)) {
    return true
  }
  
  // Só permitir se o role do usuário corresponde à rota
  return requestedRole === normalizedRole
}

/**
 * Hook para uso em componentes React
 */
export const useRoleRedirect = () => {
  return {
    getRoleRedirectUrl,
    normalizeRole,
    hasRoutePermission
  }
} 