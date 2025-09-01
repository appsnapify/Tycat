import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { toast } from 'sonner'

// ✅ HOOK: Role Authorization (Complexidade: 3 pontos)
export const useRoleAuthorization = () => {
  const router = useRouter()
  const { user } = useAuth()
  
  useEffect(() => {
    if (user && router) {                     // +1
      const userRole = user.user_metadata?.role?.toLowerCase()
      const allowedRoles = ['promotor', 'chefe-equipe', 'team-leader']

      console.log(`[CriarEquipePage] Checking role: ${userRole}`)

      if (userRole && !allowedRoles.includes(userRole)) { // +1
        toast.error("Acesso não autorizado a esta página.")
        let redirectUrl = '/app/dashboard'
        
        if (userRole === 'organizador') {     // +1
          redirectUrl = '/app/organizador/dashboard'
        }
        
        console.log(`[CriarEquipePage] Role '${userRole}' not allowed. Redirecting to ${redirectUrl}`)
        router.replace(redirectUrl)
      }
    }
  }, [user, router])
}
