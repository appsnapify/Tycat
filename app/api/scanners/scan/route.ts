import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const body = await request.json()
    const { qr_code, guest_id, scan_method = 'qr_code' } = body

    console.log('📷 SCAN REQUEST:', { qr_code: qr_code ? '***' : null, guest_id, scan_method })

    // Verificar autenticação do scanner
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ 
        error: 'Token de autorização necessário' 
      }, { status: 401 })
    }

    // Buscar sessão ativa do scanner
    const { data: session, error: sessionError } = await supabase
      .from('scanner_sessions')
      .select(`
        *,
        event_scanners(event_id, scanner_name)
      `)
      .eq('session_token', token)
      .eq('status', 'active')
      .single()

    if (sessionError || !session) {
      console.log('❌ Sessão inválida:', sessionError)
      return NextResponse.json({ 
        error: 'Sessão inválida' 
      }, { status: 401 })
    }

    const event_id = session.event_scanners?.event_id
    if (!event_id) {
      return NextResponse.json({ 
        error: 'Evento não encontrado' 
      }, { status: 400 })
    }

    // Validar entrada
    if (!qr_code && !guest_id) {
      return NextResponse.json({ 
        error: 'QR code ou guest_id é obrigatório' 
      }, { status: 400 })
    }

    let guest = null
    let guestIdToUse = guest_id

    // Se for scan por QR code, extrair guest_id
    if (qr_code && !guest_id) {
      // QR code pode ser o guest_id diretamente ou estar na URL
      if (qr_code.includes('data=')) {
        // Extrair de URL: ...data=guest_id
        const match = qr_code.match(/data=([a-f0-9-]+)/i)
        guestIdToUse = match ? match[1] : qr_code
      } else {
        // Assumir que é o guest_id diretamente
        guestIdToUse = qr_code
      }
      console.log('📷 Extracted guest_id:', guestIdToUse)
    }

    if (!guestIdToUse) {
      return NextResponse.json({ 
        error: 'Não foi possível identificar o convidado' 
      }, { status: 400 })
    }

    // Buscar guest
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .select('id, name, phone, checked_in, check_in_time, event_id')
      .eq('id', guestIdToUse)
      .eq('event_id', event_id)
      .single()

    if (guestError || !guestData) {
      console.log('❌ Guest não encontrado:', guestError)
      return NextResponse.json({ 
        error: 'Convidado não encontrado para este evento',
        success: false 
      }, { status: 404 })
    }

    guest = guestData

    // Verificar se já fez check-in
    if (guest.checked_in) {
      console.log('⚠️ Guest já fez check-in:', guest.name)
      return NextResponse.json({ 
        error: 'Convidado já fez check-in',
        success: false,
        guest_id: guest.id,
        guest_name: guest.name,
        guest_phone: guest.phone,
        check_in_time: guest.check_in_time
      }, { status: 409 })
    }

    // Realizar check-in
    const checkInTime = new Date().toISOString()
    
    const { error: updateError } = await supabase
      .from('guests')
      .update({ 
        checked_in: true,
        check_in_time: checkInTime
      })
      .eq('id', guest.id)

    if (updateError) {
      console.error('❌ Erro ao atualizar guest:', updateError)
      return NextResponse.json({ 
        error: 'Erro ao registrar check-in' 
      }, { status: 500 })
    }

    // Registrar o scan no log
    const { error: logError } = await supabase
      .from('scan_logs')
      .insert({
        session_id: session.id,
        guest_id: guest.id,
        scan_time: checkInTime,
        scan_method: scan_method,
        scan_result: 'success',
        qr_code_raw: qr_code || null,
        was_offline: false
      })

    if (logError) {
      console.error('⚠️ Erro ao registrar log (não crítico):', logError)
    }

    // Atualizar estatísticas da sessão
    await supabase
      .from('scanner_sessions')
      .update({ 
        total_scans: session.total_scans + 1,
        successful_scans: session.successful_scans + 1,
        last_activity: checkInTime
      })
      .eq('id', session.id)

    console.log('✅ CHECK-IN SUCCESS:', guest.name)

    return NextResponse.json({
      success: true,
      message: 'Check-in realizado com sucesso',
      guest_id: guest.id,
      guest_name: guest.name,
      guest_phone: guest.phone,
      check_in_time: checkInTime,
      scan_method
    })

  } catch (error) {
    console.error('❌ Erro no scan:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 })
  }
} 