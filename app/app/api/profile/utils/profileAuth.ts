import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ✅ FUNÇÃO UTILITÁRIA: authenticateUser (Complexidade: 4 pontos)
export const authenticateUser = async () => {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) { // +1
    console.error('Erro ao obter sessão:', sessionError)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Erro ao verificar autenticação', details: sessionError.message },
        { status: 401 }
      )
    }
  }
  
  if (!session) { // +1
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Não autenticado. Faça login para continuar.' },
        { status: 401 }
      )
    }
  }
  
  return {
    success: true,
    userId: session.user.id,
    supabase
  }
}
