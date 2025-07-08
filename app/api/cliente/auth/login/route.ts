import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // ✅ API temporária simplificada
    return NextResponse.json({ success: false, error: 'Em desenvolvimento' }, { status: 501 })
  } catch (error) {
    console.error('❌ [CLIENTE-LOGIN] Erro:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 