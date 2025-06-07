import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar se conseguimos acessar a tabela guests
    console.log('🔍 Debug: Testando acesso à tabela guests')
    
    // 1. Tentar listar alguns guests
    const { data: guests, error: listError } = await supabase
      .from('guests')
      .select('id, name, checked_in, event_id, created_at')
      .limit(5)
    
    console.log('📋 Lista de guests:', { guests, listError })
    
    // 2. Tentar buscar um guest específico se fornecido
    const url = new URL(request.url)
    const guestId = url.searchParams.get('guest_id')
    
    let specificGuest = null
    let specificError = null
    
    if (guestId) {
      console.log('🔍 Buscando guest específico:', guestId)
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single()
      
      specificGuest = data
      specificError = error
      console.log('👤 Guest específico:', { data, error })
    }
    
    // 3. Testar estrutura da tabela (tentar update simples sem condições)
    let updateTest = null
    let updateError = null
    
    if (guestId && specificGuest && !specificError) {
      console.log('🧪 Testando update no guest:', guestId)
      try {
        const { data, error } = await supabase
          .from('guests')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', guestId)
          .select()
          .single()
        
        updateTest = data
        updateError = error
        console.log('🔄 Teste de update:', { data, error })
      } catch (err) {
        updateError = err
        console.log('❌ Erro no teste de update:', err)
      }
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        list_guests: {
          data: guests,
          error: listError,
          count: guests?.length || 0
        },
        specific_guest: guestId ? {
          guest_id: guestId,
          data: specificGuest,
          error: specificError
        } : null,
        update_test: guestId ? {
          guest_id: guestId,
          data: updateTest,
          error: updateError
        } : null,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Erro no debug guests:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { guest_id } = body
    
    if (!guest_id) {
      return NextResponse.json({
        success: false,
        error: 'guest_id é obrigatório'
      }, { status: 400 })
    }
    
    console.log('🧪 Testando operações no guest:', guest_id)
    
    // 1. Buscar guest
    const { data: guest, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guest_id)
      .single()
    
    if (fetchError || !guest) {
      return NextResponse.json({
        success: false,
        error: 'Guest não encontrado',
        details: fetchError
      }, { status: 404 })
    }
    
    // 2. Tentar update do check-in
    const testTime = new Date().toISOString()
    
    // Teste 1: Update completo
    console.log('🧪 Teste 1: Update completo')
    const { data: result1, error: error1 } = await supabase
      .from('guests')
      .update({
        checked_in: true,
        checked_in_at: testTime,
        check_in_time: testTime,
        updated_at: testTime
      })
      .eq('id', guest_id)
      .select()
      .single()
    
    // Teste 2: Update simples
    console.log('🧪 Teste 2: Update simples')
    const { data: result2, error: error2 } = await supabase
      .from('guests')
      .update({ checked_in: true })
      .eq('id', guest_id)
      .select()
      .single()
    
    return NextResponse.json({
      success: true,
      guest_original: guest,
      tests: {
        complete_update: {
          data: result1,
          error: error1
        },
        simple_update: {
          data: result2,
          error: error2
        }
      },
      timestamp: testTime
    })
    
  } catch (error) {
    console.error('❌ Erro no teste de guest:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 