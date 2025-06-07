import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatPortugalTime } from '@/lib/utils/time'

// Forçar rota dinâmica
export const dynamic = 'force-dynamic'
export const runtime = 'edge' // Opcional: usar edge runtime para melhor performance

export async function POST(request: NextRequest) {
  let requestId = Math.random().toString(36).substr(2, 9)
  console.log(`🆔 [${requestId}] Nova requisição de scan iniciada`)
  
  try {
    const supabase = await createClient()
    console.log(`🔧 [${requestId}] Supabase client criado`)
    
    // Verificar token de autenticação
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log(`❌ [${requestId}] Token não fornecido`)
      return NextResponse.json({ 
        error: 'Token de autorização necessário' 
      }, { status: 401 })
    }
    console.log(`🔑 [${requestId}] Token recebido: ${token.substring(0, 10)}...`)

    // Buscar dados do body
    let body
    try {
      body = await request.json()
      console.log(`📦 [${requestId}] Body parsing bem-sucedido:`, body)
    } catch (bodyError) {
      console.log(`❌ [${requestId}] Erro ao fazer parse do body:`, bodyError)
      return NextResponse.json({ 
        error: 'Erro no formato dos dados' 
      }, { status: 400 })
    }
    
    const { qr_code: qrCode, scan_method: method = 'qr_code' } = body

    if (!qrCode) {
      console.log(`❌ [${requestId}] QR Code não fornecido`)
      return NextResponse.json({ 
        error: 'QR Code necessário' 
      }, { status: 400 })
    }

    // Validar se QR code é um UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qrCode)) {
      console.log(`❌ [${requestId}] QR Code inválido (não é UUID):`, qrCode)
      return NextResponse.json({ 
        error: 'QR Code inválido' 
      }, { status: 400 })
    }

    console.log(`🔍 [${requestId}] QR Code válido. Processando scan:`, { qrCode, method })

    // Buscar sessão ativa do scanner
    console.log(`🔍 [${requestId}] Buscando sessão do scanner...`)
    let session, sessionError
    try {
      const result = await supabase
        .from('scanner_sessions')
        .select(`
          *,
          event_scanners(
            id,
            event_id,
            scanner_name,
            events(
              id,
              title
            )
          )
        `)
        .eq('session_token', token)
        .eq('status', 'active')
        .single()
      
      session = result.data
      sessionError = result.error
      console.log(`📊 [${requestId}] Busca de sessão:`, { found: !!session, error: sessionError })
      
    } catch (sessionQueryError) {
      console.log(`❌ [${requestId}] Erro na query de sessão:`, sessionQueryError)
      sessionError = sessionQueryError
    }

    if (sessionError || !session?.event_scanners) {
      console.log(`❌ [${requestId}] Sessão inválida:`, {
        error: sessionError,
        hasSession: !!session,
        hasEventScanners: !!session?.event_scanners
      })
      return NextResponse.json({ 
        error: 'Sessão inválida' 
      }, { status: 401 })
    }

    const eventId = session.event_scanners.events.id
    console.log(`🎯 [${requestId}] Event ID identificado:`, eventId)

    // Buscar convidado pelo QR code
    console.log(`👤 [${requestId}] Buscando guest no evento...`)
    let guest, guestError
    try {
      const result = await supabase
        .from('guests')
        .select('*')
        .eq('id', qrCode)
        .eq('event_id', eventId)
        .single()
      
      guest = result.data
      guestError = result.error
      console.log(`📊 [${requestId}] Busca de guest:`, { 
        found: !!guest, 
        error: guestError,
        guestData: guest ? {
          id: guest.id,
          name: guest.name,
          checked_in: guest.checked_in,
          event_id: guest.event_id
        } : null
      })
      
    } catch (guestQueryError) {
      console.log(`❌ [${requestId}] Erro na query de guest:`, guestQueryError)
      guestError = guestQueryError
    }

    if (guestError || !guest) {
      console.log(`❌ [${requestId}] Convidado não encontrado:`, {
        qrCode,
        eventId,
        error: guestError
      })
      return NextResponse.json({ 
        error: 'Convidado não encontrado para este evento' 
      }, { status: 404 })
    }

    // Verificar se já fez check-in (usando campo checked_in)
    console.log(`🔍 [${requestId}] Verificando status de check-in:`, {
      checked_in: guest.checked_in,
      checked_in_at: guest.checked_in_at,
      check_in_time: guest.check_in_time
    })
    
    if (guest.checked_in) {
      // 🕐 Tentar múltiplos campos possíveis para o timestamp do check-in
      const previousCheckIn = guest.checked_in_at || guest.check_in_time || guest.updated_at || guest.created_at
      console.log(`⚠️ [${requestId}] Check-in já realizado. Timestamps:`, {
        checked_in_at: guest.checked_in_at,
        check_in_time: guest.check_in_time,
        updated_at: guest.updated_at,
        created_at: guest.created_at,
        chosen: previousCheckIn
      })
      
      let formattedTime
      try {
        formattedTime = formatPortugalTime(previousCheckIn)
        console.log(`🕐 [${requestId}] Timestamp formatado:`, formattedTime)
      } catch (timeError) {
        console.log(`❌ [${requestId}] Erro ao formatar timestamp:`, timeError)
        formattedTime = 'Horário não disponível'
      }
      
      console.log(`⚠️ [${requestId}] Retornando 409 - Check-in já realizado`)
      return NextResponse.json({
        error: 'Check-in já realizado',
        guest_name: guest.name,
        guest_phone: guest.phone,
        check_in_time: previousCheckIn,
        check_in_display_time: formattedTime,
        already_checked_in: true
      }, { status: 409 })
    }
    
    console.log(`✅ [${requestId}] Guest não tem check-in. Procedendo com registro...`)

    // Registrar check-in (atualizar campo checked_in e timestamp)
    const checkInTime = new Date().toISOString() // UTC (boa prática para BD)
    console.log(`🕐 [${requestId}] Timestamp de check-in gerado:`, checkInTime)
    
    console.log(`🔄 [${requestId}] Iniciando processo de atualização de check-in`)
    console.log(`🔍 [${requestId}] Dados do guest antes do update:`, { 
      id: guest.id, 
      checked_in: guest.checked_in, 
      name: guest.name,
      event_id: guest.event_id,
      created_at: guest.created_at,
      updated_at: guest.updated_at
    })
    
    // 🛡️ ABORDAGEM ROBUSTA: Tentar diferentes strategies para update
    let updatedGuest: any = null
    let updateError: any = null
    let finalCheckInTime = checkInTime
    
    // 1️⃣ PRIMEIRA TENTATIVA: Update completo com todos os campos
    try {
      console.log(`🔄 [${requestId}] Tentativa 1: Update com todos os campos`)
      const updateFields = {
        checked_in: true,
        checked_in_at: checkInTime,
        check_in_time: checkInTime,
        updated_at: checkInTime
      }
      console.log(`📝 [${requestId}] Campos para update:`, updateFields)
      
      const result = await supabase
        .from('guests')
        .update(updateFields)
        .eq('id', guest.id)
        .eq('checked_in', false)
        .select()
        .single()
      
      console.log(`📊 [${requestId}] Resultado da tentativa 1:`, {
        hasData: !!result.data,
        hasError: !!result.error,
        error: result.error
      })
      
      if (result.data && !result.error) {
        updatedGuest = result.data
        console.log(`✅ [${requestId}] Tentativa 1 bem-sucedida`)
      } else {
        throw result.error
      }
    } catch (error1) {
      console.log(`⚠️ [${requestId}] Tentativa 1 falhou:`, {
        message: error1?.message,
        code: error1?.code,
        details: error1?.details,
        hint: error1?.hint,
        full_error: error1
      })
      
      // 2️⃣ SEGUNDA TENTATIVA: Update só do campo checked_in
      try {
        console.log(`🔄 [${requestId}] Tentativa 2: Update só campo checked_in`)
        const result = await supabase
          .from('guests')
          .update({ checked_in: true })
          .eq('id', guest.id)
          .eq('checked_in', false)
          .select()
          .single()
        
        console.log(`📊 [${requestId}] Resultado da tentativa 2:`, {
          hasData: !!result.data,
          hasError: !!result.error,
          error: result.error
        })
        
        if (result.data && !result.error) {
          updatedGuest = result.data
          console.log(`✅ [${requestId}] Tentativa 2 bem-sucedida`)
        } else {
          throw result.error
        }
      } catch (error2) {
        console.log(`⚠️ [${requestId}] Tentativa 2 falhou:`, {
          message: error2?.message,
          code: error2?.code,
          details: error2?.details,
          hint: error2?.hint,
          full_error: error2
        })
        
        // 3️⃣ TERCEIRA TENTATIVA: Update sem condição checked_in=false (caso race condition)
        try {
          console.log(`🔄 [${requestId}] Tentativa 3: Update sem condição`)
          const result = await supabase
            .from('guests')
            .update({ checked_in: true })
            .eq('id', guest.id)
            .select()
            .single()
          
          console.log(`📊 [${requestId}] Resultado da tentativa 3:`, {
            hasData: !!result.data,
            hasError: !!result.error,
            error: result.error,
            resultData: result.data
          })
          
          if (result.data && !result.error) {
            // Verificar se realmente estava false antes
            if (result.data.checked_in === true) {
              console.log(`⚠️ [${requestId}] Guest já tinha check-in, mas conseguimos atualizar`)
              // Se já estava true, pode ser race condition - retornar 409
              const existingTime = result.data.checked_in_at || result.data.check_in_time || result.data.updated_at || checkInTime
              finalCheckInTime = existingTime
              
              console.log(`🔄 [${requestId}] Retornando 409 por race condition`)
              return NextResponse.json({
                error: 'Check-in já realizado',
                guest_name: guest.name,
                guest_phone: guest.phone,
                check_in_time: existingTime,
                check_in_display_time: formatPortugalTime(existingTime),
                already_checked_in: true
              }, { status: 409 })
            }
            updatedGuest = result.data
            console.log(`✅ [${requestId}] Tentativa 3 bem-sucedida`)
          } else {
            throw result.error
          }
        } catch (error3) {
          console.log(`❌ [${requestId}] Tentativa 3 falhou:`, {
            message: error3?.message,
            code: error3?.code,
            details: error3?.details,
            hint: error3?.hint,
            full_error: error3
          })
          console.log(`❌ [${requestId}] Todas as tentativas falharam`)
          updateError = error3
        }
      }
    }

    // Se todas as tentativas falharam
    if (updateError || !updatedGuest) {
      console.log(`❌ [${requestId}] Erro ao atualizar check-in após todas as tentativas:`, updateError)
      console.log(`❌ [${requestId}] Detalhes completos do erro:`, {
        message: updateError?.message,
        code: updateError?.code,
        details: updateError?.details,
        hint: updateError?.hint,
        full_error: updateError
      })
      console.log(`📊 [${requestId}] Estado final:`, {
        hasUpdateError: !!updateError,
        hasUpdatedGuest: !!updatedGuest,
        guestId: guest.id,
        guestCheckedIn: guest.checked_in
      })
      
      return NextResponse.json({ 
        error: 'Erro ao registrar check-in',
        details: updateError?.message || 'Falha em todas as tentativas de atualização',
        debug_request_id: requestId
      }, { status: 500 })
    }

    console.log(`✅ [${requestId}] Check-in realizado com sucesso:`, {
      guest_id: updatedGuest.id,
      guest_name: guest.name,
      timestamp: finalCheckInTime,
      updated_guest_data: updatedGuest
    })

    let displayTime
    try {
      displayTime = formatPortugalTime(finalCheckInTime)
      console.log(`🕐 [${requestId}] Display time formatado:`, displayTime)
    } catch (timeError) {
      console.log(`⚠️ [${requestId}] Erro ao formatar display time:`, timeError)
      displayTime = 'Horário não disponível'
    }

    return NextResponse.json({
      success: true,
      guest_name: guest.name,
      guest_phone: guest.phone,
      check_in_time: finalCheckInTime,
      check_in_display_time: displayTime,
      debug_request_id: requestId
    })

  } catch (error) {
    console.error(`❌ [${requestId}] Erro fatal no processamento:`, error)
    console.error(`❌ [${requestId}] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      debug_request_id: requestId
    }, { status: 500 })
  }
} 