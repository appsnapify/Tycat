import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const guestId = url.searchParams.get('guest_id')
    const eventId = url.searchParams.get('event_id') || '45075409-5556-499b-9a59-61b8da8af98c'
    
    console.log('🔍 Debug Scanner Guest:', { guestId, eventId })
    
    // 1. Buscar guest específico se fornecido
    let guestDetails = null
    if (guestId) {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single()
      
      guestDetails = {
        found: !!data,
        data: data,
        error: error,
        timestamps: data ? {
          created_at: data.created_at,
          updated_at: data.updated_at,
          checked_in_at: data.checked_in_at,
          check_in_time: data.check_in_time,
          checked_in: data.checked_in
        } : null
      }
      
      console.log('👤 Guest details:', guestDetails)
    }
    
    // 2. Buscar guests recentes do evento (últimos 10)
    const { data: recentGuests, error: recentError } = await supabase
      .from('guests')
      .select('id, name, checked_in, created_at, updated_at, checked_in_at, check_in_time')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // 3. Buscar guests que fizeram check-in recentemente
    const { data: recentCheckIns, error: checkInError } = await supabase
      .from('guests')
      .select('id, name, checked_in, created_at, updated_at, checked_in_at, check_in_time')
      .eq('event_id', eventId)
      .eq('checked_in', true)
      .order('updated_at', { ascending: false })
      .limit(5)
    
    // 4. Estatísticas gerais
    const { data: totalGuests, error: totalError } = await supabase
      .from('guests')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId)
    
    const { data: checkedInGuests, error: checkedError } = await supabase
      .from('guests')
      .select('id', { count: 'exact' })
      .eq('event_id', eventId)
      .eq('checked_in', true)
    
    // 5. Análise de timestamps (procurar discrepâncias)
    const timestampAnalysis = recentCheckIns?.map(guest => {
      const created = guest.created_at ? new Date(guest.created_at) : null
      const updated = guest.updated_at ? new Date(guest.updated_at) : null
      const checkedInAt = guest.checked_in_at ? new Date(guest.checked_in_at) : null
      const checkInTime = guest.check_in_time ? new Date(guest.check_in_time) : null
      
      return {
        id: guest.id,
        name: guest.name,
        timestamps: {
          created_at: created?.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
          updated_at: updated?.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
          checked_in_at: checkedInAt?.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
          check_in_time: checkInTime?.toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' })
        },
        discrepancy: {
          created_vs_updated: created && updated ? Math.abs(updated.getTime() - created.getTime()) / 1000 / 60 : null,
          has_check_in_timestamp: !!(checkedInAt || checkInTime),
          using_timestamp: checkedInAt || checkInTime || updated || created
        }
      }
    }) || []
    
    return NextResponse.json({
      success: true,
      event_id: eventId,
      guest_specific: guestDetails,
      recent_guests: {
        data: recentGuests,
        error: recentError,
        count: recentGuests?.length || 0
      },
      recent_check_ins: {
        data: recentCheckIns,
        error: checkInError,
        count: recentCheckIns?.length || 0
      },
      stats: {
        total_guests: totalGuests?.length || 0,
        checked_in_guests: checkedInGuests?.length || 0,
        total_error: totalError,
        checked_error: checkedError
      },
      timestamp_analysis: timestampAnalysis,
      debug_info: {
        current_time_utc: new Date().toISOString(),
        current_time_portugal: new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' }),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Erro no debug scanner guest:', error)
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
    const { guest_id, test_check_in = false } = body
    
    if (!guest_id) {
      return NextResponse.json({
        success: false,
        error: 'guest_id é obrigatório'
      }, { status: 400 })
    }
    
    console.log('🧪 Teste de check-in no guest:', guest_id)
    
    // 1. Buscar guest atual
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
    
    let testResults: any = {
      guest_before: guest
    }
    
    if (test_check_in) {
      const testTime = new Date().toISOString()
      
      // Simular exatamente o que a API do scanner faz
      console.log('🧪 Simulando processo de check-in')
      
      // Tentativa 1: Update completo
      console.log('🧪 Teste 1: Update completo')
      try {
        const { data: result1, error: error1 } = await supabase
          .from('guests')
          .update({
            checked_in: true,
            checked_in_at: testTime,
            check_in_time: testTime,
            updated_at: testTime
          })
          .eq('id', guest_id)
          .eq('checked_in', false)
          .select()
          .single()
        
        testResults.test1_complete_update = {
          success: !!result1 && !error1,
          data: result1,
          error: error1
        }
        
        if (result1 && !error1) {
          console.log('✅ Teste 1 bem-sucedido')
          testResults.final_result = result1
        } else {
          throw error1
        }
        
      } catch (error1) {
        console.log('⚠️ Teste 1 falhou:', error1)
        testResults.test1_complete_update = {
          success: false,
          error: error1
        }
        
        // Tentativa 2: Update simples
        try {
          console.log('🧪 Teste 2: Update simples')
          const { data: result2, error: error2 } = await supabase
            .from('guests')
            .update({ checked_in: true })
            .eq('id', guest_id)
            .eq('checked_in', false)
            .select()
            .single()
          
          testResults.test2_simple_update = {
            success: !!result2 && !error2,
            data: result2,
            error: error2
          }
          
          if (result2 && !error2) {
            console.log('✅ Teste 2 bem-sucedido')
            testResults.final_result = result2
          } else {
            throw error2
          }
          
        } catch (error2) {
          console.log('⚠️ Teste 2 falhou:', error2)
          testResults.test2_simple_update = {
            success: false,
            error: error2
          }
          
          // Tentativa 3: Update sem condição
          try {
            console.log('🧪 Teste 3: Update sem condição')
            const { data: result3, error: error3 } = await supabase
              .from('guests')
              .update({ checked_in: true })
              .eq('id', guest_id)
              .select()
              .single()
            
            testResults.test3_no_condition = {
              success: !!result3 && !error3,
              data: result3,
              error: error3
            }
            
            if (result3 && !error3) {
              console.log('✅ Teste 3 bem-sucedido')
              testResults.final_result = result3
            } else {
              throw error3
            }
            
          } catch (error3) {
            console.log('❌ Todos os testes falharam')
            testResults.test3_no_condition = {
              success: false,
              error: error3
            }
            testResults.all_failed = true
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      test_results: testResults,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Erro no teste de check-in:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
} 