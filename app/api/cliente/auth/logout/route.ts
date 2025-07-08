import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // ✅ Para sistemas simples, apenas confirmar logout
    return NextResponse.json({ 
      success: true, 
      message: 'Logout efetuado com sucesso' 
    })
  } catch (error) {
    console.error('❌ [CLIENTE-LOGOUT] Erro:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 