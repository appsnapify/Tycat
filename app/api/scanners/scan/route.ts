import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatPortugalTime } from '@/lib/utils/time'

// Forçar rota dinâmica
export const dynamic = 'force-dynamic'
export const runtime = 'edge' // Opcional: usar edge runtime para melhor performance

// ✅ FUNÇÃO AUXILIAR: Validar token de autenticação (Complexidade: 2)
function validateAuthToken(request: NextRequest, requestId: string) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log(`❌ [${requestId}] Token não fornecido`)
    return { error: 'Token de autorização necessário', status: 401 }
    }
    console.log(`🔑 [${requestId}] Token recebido: ${token.substring(0, 10)}...`)
  return { token }
}

// ✅ FUNÇÃO AUXILIAR: Processar body da requisição (Complexidade: 3)
async function processRequestBody(request: NextRequest, requestId: string) {
    try {
    const body = await request.json()
      console.log(`📦 [${requestId}] Body parsing bem-sucedido:`, body)
    return { body }
    } catch (bodyError) {
      console.log(`❌ [${requestId}] Erro ao fazer parse do body:`, bodyError)
    return { error: 'Erro no formato dos dados', status: 400 }
  }
    }
    
// ✅ FUNÇÃO AUXILIAR: Validar QR Code (Complexidade: 3)
function validateQRCode(qrCode: string, requestId: string) {
    if (!qrCode) {
      console.log(`❌ [${requestId}] QR Code não fornecido`)
    return { error: 'QR Code necessário', status: 400 }
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qrCode)) {
      console.log(`❌ [${requestId}] QR Code inválido (não é UUID):`, qrCode)
    return { error: 'QR Code inválido', status: 400 }
  }
  
  return { qrCode }
}

// ✅ FUNÇÃO AUXILIAR: Validar sessão do scanner (Complexidade: 3)
async function validateScannerSession(supabase: any, token: string, requestId: string) {
  const { data: session, error: sessionError } = await supabase
        .from('scanner_sessions')
    .select(`*, event_scanners(event_id, scanner_name)`)
        .eq('session_token', token)
        .eq('status', 'active')
        .single()
      
  if (sessionError || !session) {
    console.log(`❌ [${requestId}] Sessão inválida:`, sessionError)
    return { error: 'Sessão inválida', status: 401 }
  }

  const event_id = session.event_scanners?.event_id
  if (!event_id) {
    console.log(`❌ [${requestId}] Evento não encontrado na sessão`)
    return { error: 'Evento não encontrado', status: 400 }
  }

  return { session, event_id }
}

// ✅ FUNÇÃO AUXILIAR: Buscar guest pelo QR Code (Complexidade: 3)
async function findGuestByQRCode(supabase: any, qrCode: string, event_id: string, requestId: string) {
  console.log(`🔍 [${requestId}] Buscando guest com QR code: ${qrCode}`)
  
  const { data: guest, error: guestError } = await supabase
        .from('guests')
        .select('*')
    .eq('qr_code', qrCode)
    .eq('event_id', event_id)
        .single()
      
  if (guestError) {
    console.log(`❌ [${requestId}] Erro ao buscar guest:`, guestError)
    return { error: 'Erro ao buscar convidado', status: 500 }
  }

  if (!guest) {
    console.log(`❌ [${requestId}] Guest não encontrado`)
    return { error: 'Convidado não encontrado', status: 404 }
  }

  return { guest }
}

// ✅ FUNÇÃO AUXILIAR: Verificar se guest já tem check-in (Complexidade: 2)
function checkExistingCheckIn(guest: any, requestId: string) {
    if (guest.checked_in) {
    const previousCheckIn = guest.check_in_time
    console.log(`⚠️ [${requestId}] Guest já tem check-in:`, { 
      name: guest.name, 
      previousCheckIn,
      guestId: guest.id 
        })
      
      let formattedTime
      try {
        formattedTime = formatPortugalTime(previousCheckIn)
        console.log(`🕐 [${requestId}] Timestamp formatado:`, formattedTime)
      } catch (timeError) {
        console.log(`❌ [${requestId}] Erro ao formatar timestamp:`, timeError)
        formattedTime = 'Horário não disponível'
      }
      
    return {
        error: 'Check-in já realizado',
        guest_name: guest.name,
        guest_phone: guest.phone,
        check_in_time: previousCheckIn,
        check_in_display_time: formattedTime,
      already_checked_in: true,
      status: 409
    }
  }
  
  return null
}

// ✅ FUNÇÃO AUXILIAR: Executar tentativa de check-in (Complexidade: 3)
async function attemptCheckIn(supabase: any, guest: any, checkInTime: string, attemptNumber: number, requestId: string) {
  console.log(`🔄 [${requestId}] Tentativa ${attemptNumber}: Iniciando`)
  
  let updateQuery = supabase
    .from('guests')
    .update(attemptNumber === 1 ? { checked_in: true, check_in_time: checkInTime } : { checked_in: true })
    .eq('id', guest.id)
  
  // Adicionar condição checked_in=false apenas nas tentativas 1 e 2
  if (attemptNumber <= 2) {
    updateQuery = updateQuery.eq('checked_in', false)
  }
  
  const result = await updateQuery.select().single()
  
  console.log(`📊 [${requestId}] Resultado da tentativa ${attemptNumber}:`, {
        hasData: !!result.data,
        hasError: !!result.error,
        error: result.error
      })
      
      if (result.data && !result.error) {
    console.log(`✅ [${requestId}] Tentativa ${attemptNumber} bem-sucedida`)
    return { success: true, data: result.data }
  }
  
          throw result.error
        }

// ✅ FUNÇÃO AUXILIAR: Processar múltiplas tentativas de check-in (Complexidade: 7)
async function processCheckInAttempts(supabase: any, guest: any, checkInTime: string, requestId: string) {
  let updatedGuest: any = null
  let finalCheckInTime = checkInTime
  
  // Tentar 3 estratégias diferentes
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await attemptCheckIn(supabase, guest, checkInTime, attempt, requestId)
      
      // Verificar race condition na tentativa 3
      if (attempt === 3 && result.data.checked_in === true) {
        console.log(`⚠️ [${requestId}] Race condition detectada na tentativa 3`)
              const existingTime = result.data.check_in_time || checkInTime
              finalCheckInTime = existingTime
              
        return {
                error: 'Check-in já realizado',
                guest_name: guest.name,
                guest_phone: guest.phone,
                check_in_time: existingTime,
                check_in_display_time: formatPortugalTime(existingTime),
          already_checked_in: true,
          status: 409
        }
            }
      
            updatedGuest = result.data
      break // Sucesso, sair do loop
      
    } catch (error) {
      console.log(`⚠️ [${requestId}] Tentativa ${attempt} falhou:`, {
        message: error?.message,
        code: error?.code,
        details: error?.details
      })
      
      if (attempt === 3) {
        // Todas as tentativas falharam
        return {
          error: 'Erro ao registrar check-in',
          details: error?.message || 'Falha em todas as tentativas de atualização',
          debug_request_id: requestId,
          status: 500
        }
      }
    }
  }
  
  return { updatedGuest, finalCheckInTime }
}

// ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 19 → <8)
export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substr(2, 9)
  console.log(`🆔 [${requestId}] Nova requisição de scan iniciada`)
  
  try {
    const supabase = await createClient()
    console.log(`🔧 [${requestId}] Supabase client criado`)
    
    // 1. Validar token de autenticação
    const authResult = validateAuthToken(request, requestId)
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const { token } = authResult

    // 2. Processar body da requisição
    const bodyResult = await processRequestBody(request, requestId)
    if (bodyResult.error) {
      return NextResponse.json({ error: bodyResult.error }, { status: bodyResult.status })
    }
    const { qr_code: qrCode, scan_method: method = 'qr_code' } = bodyResult.body

    // 3. Validar QR Code
    const qrResult = validateQRCode(qrCode, requestId)
    if (qrResult.error) {
      return NextResponse.json({ error: qrResult.error }, { status: qrResult.status })
    }

    console.log(`🔍 [${requestId}] QR Code válido. Processando scan:`, { qrCode, method })

    // 4. Validar sessão do scanner
    const sessionResult = await validateScannerSession(supabase, token, requestId)
    if (sessionResult.error) {
      return NextResponse.json({ error: sessionResult.error }, { status: sessionResult.status })
    }
    const { session, event_id } = sessionResult

    // 5. Buscar guest pelo QR Code
    const guestResult = await findGuestByQRCode(supabase, qrCode, event_id, requestId)
    if (guestResult.error) {
      return NextResponse.json({ error: guestResult.error }, { status: guestResult.status })
    }
    const { guest } = guestResult

    // 6. Verificar se já tem check-in
    const existingCheckIn = checkExistingCheckIn(guest, requestId)
    if (existingCheckIn) {
      return NextResponse.json(existingCheckIn, { status: existingCheckIn.status })
    }

    console.log(`✅ [${requestId}] Guest não tem check-in. Procedendo com registro...`)

    // 7. Processar check-in com múltiplas tentativas
    const checkInTime = new Date().toISOString()
    console.log(`🕐 [${requestId}] Timestamp de check-in gerado:`, checkInTime)
    
    const checkInResult = await processCheckInAttempts(supabase, guest, checkInTime, requestId)
    if (checkInResult.error) {
      return NextResponse.json(checkInResult, { status: checkInResult.status })
    }
    const { updatedGuest, finalCheckInTime } = checkInResult

    console.log(`✅ [${requestId}] Check-in realizado com sucesso:`, {
      guest_id: updatedGuest.id,
      guest_name: guest.name,
      timestamp: finalCheckInTime,
      updated_guest_data: updatedGuest
    })

    // 8. Formatar timestamp para display
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