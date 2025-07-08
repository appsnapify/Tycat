import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // ✅ API temporária simplificada
    return NextResponse.json({ 
      success: true, 
      events: [] 
    })
  } catch (error) {
    console.error('❌ [CLIENTE-EVENTS] Erro interno:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 