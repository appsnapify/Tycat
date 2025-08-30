import { NextResponse } from 'next/server'

// ✅ FUNÇÃO UTILITÁRIA: createSuccessResponse (Complexidade: 1 ponto)
export const createSuccessResponse = (data: any) => {
  const headers = new Headers()
  headers.append('Cache-Control', 's-maxage=300, stale-while-revalidate')
  
  return NextResponse.json(data, {
    headers,
    status: 200
  })
}

// ✅ FUNÇÃO UTILITÁRIA: createErrorResponse (Complexidade: 1 ponto)
export const createErrorResponse = (error: any) => {
  console.error('Exceção ao processar solicitação de perfil:', error)
  return NextResponse.json(
    { error: 'Erro interno do servidor' },
    { status: 500 }
  )
}
