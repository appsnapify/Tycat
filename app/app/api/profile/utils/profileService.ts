import { NextResponse } from 'next/server'

// ✅ FUNÇÃO UTILITÁRIA: fetchUserProfile (Complexidade: 6 pontos)
export const fetchUserProfile = async (supabase: any, userId: string) => {
  console.log('Obtendo perfil para usuário:', userId)
  
  const { data: profileData, error: profileError } = await supabase.rpc(
    'get_promoter_profile',
    { user_id_param: userId }
  )
  
  if (profileError) { // +1
    console.error('Erro ao obter perfil do promotor:', profileError)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Erro ao obter perfil', details: profileError.message },
        { status: 500 }
      )
    }
  }
  
  if (!profileData) { // +1
    console.warn('Nenhum dado de perfil encontrado para o usuário:', userId)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Perfil não encontrado' },
        { status: 404 }
      )
    }
  }
  
  if (profileData.error) { // +1
    console.error('Erro retornado pela função get_promoter_profile:', profileData.error)
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Erro ao processar perfil', details: profileData.error },
        { status: 500 }
      )
    }
  }
  
  return {
    success: true,
    data: profileData
  }
}
