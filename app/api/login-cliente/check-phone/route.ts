// API dedicada para verificação de telefone - Sistema login/cliente isolado
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // ✅ CLIENTE SERVIDOR NORMAL
import type { PhoneCheckResponse } from '@/components/login-cliente/types'

export async function POST(request: NextRequest) {
  try {
    // Parse do corpo da requisição
    const body = await request.json()
    const { phone } = body

    // Validação básica
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json<PhoneCheckResponse>({
        success: false,
        exists: false,
        error: 'Número de telefone é obrigatório'
      }, { status: 400 })
    }

    // Normalizar telefone (adicionar +351 se necessário) - IGUAL AO SISTEMA PROMO
    let normalizedPhone = phone.trim()
    if (!normalizedPhone.startsWith('+351')) {
      normalizedPhone = '+351' + normalizedPhone.replace(/^\+?351/, '')
    }

    // Validação de formato básico
    if (normalizedPhone.length < 9) {
      return NextResponse.json<PhoneCheckResponse>({
        success: false,
        exists: false,
        error: 'Formato de telefone inválido'
      }, { status: 400 })
    }

    // ✅ CLIENTE SERVIDOR PADRÃO (rápido e confiável)
    const supabase = await createClient()

    // Verificar se existe cliente com este telefone
    const { data: existingUser, error: queryError } = await supabase
      .from('client_users')
      .select('id, phone')
      .eq('phone', normalizedPhone)
      .maybeSingle()

    if (queryError) {
      console.error('[LOGIN-CLIENTE] Erro ao verificar telefone:', queryError)
      return NextResponse.json<PhoneCheckResponse>({
        success: false,
        exists: false,
        error: 'Erro interno do servidor'
      }, { status: 500 })
    }

    // Resposta baseada na existência do utilizador
    if (existingUser) {
      return NextResponse.json<PhoneCheckResponse>({
        success: true,
        exists: true,
        userId: existingUser.id
      })
    } else {
      return NextResponse.json<PhoneCheckResponse>({
        success: true,
        exists: false
      })
    }

  } catch (error) {
    console.error('[LOGIN-CLIENTE] Erro na verificação de telefone:', error)
    return NextResponse.json<PhoneCheckResponse>({
      success: false,
      exists: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 