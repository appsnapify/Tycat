// API dedicada para registo de cliente - Sistema login/cliente isolado
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server' // ✅ CLIENTE SERVIDOR NORMAL
import type { ClientUser } from '@/types/client'
import type { AuthResponse, RegisterRequest } from '@/components/login-cliente/types'
import bcrypt from 'bcryptjs'

// Rate limiting simples (prevenção de spam)
const registrationAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 3
const WINDOW_MS = 5 * 60 * 1000 // 5 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const attempts = registrationAttempts.get(ip)
  
  if (!attempts) {
    registrationAttempts.set(ip, { count: 1, lastAttempt: now })
    return true
  }
  
  // Reset contador se passou da janela de tempo
  if (now - attempts.lastAttempt > WINDOW_MS) {
    registrationAttempts.set(ip, { count: 1, lastAttempt: now })
    return true
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false
  }
  
  attempts.count++
  attempts.lastAttempt = now
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting por IP
    const ip = request.ip || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Muitas tentativas de registo. Tente novamente em 5 minutos.'
      }, { status: 429 })
    }

    // Parse do corpo da requisição
    const body: RegisterRequest = await request.json()
    const { 
      phone, 
      email, 
      first_name, 
      last_name, 
      password, 
      birth_date, 
      postal_code, 
      gender 
    } = body

    // Validações básicas obrigatórias
    if (!phone || typeof phone !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Telefone é obrigatório'
      }, { status: 400 })
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Email é obrigatório'
      }, { status: 400 })
    }

    if (!first_name || typeof first_name !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Nome é obrigatório'
      }, { status: 400 })
    }

    if (!last_name || typeof last_name !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Apelido é obrigatório'
      }, { status: 400 })
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Palavra-passe é obrigatória'
      }, { status: 400 })
    }

    if (!postal_code || typeof postal_code !== 'string') {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Código postal é obrigatório'
      }, { status: 400 })
    }

    // Validações de formato
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Formato de email inválido'
      }, { status: 400 })
    }

    const postalCodeRegex = /^\d{4}-\d{3}$/
    if (!postalCodeRegex.test(postal_code)) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Código postal deve ter formato: 4750-850'
      }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Palavra-passe deve ter pelo menos 8 caracteres'
      }, { status: 400 })
    }

    // Validação de género opcional
    if (gender && !['M', 'F', 'O'].includes(gender)) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Género deve ser M, F ou O'
      }, { status: 400 })
    }

    // Normalizar dados
    const normalizedPhone = phone.trim()
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedFirstName = first_name.trim()
    const normalizedLastName = last_name.trim()
    const normalizedPostalCode = postal_code.trim()

    // ✅ CLIENTE SERVIDOR PADRÃO (rápido e confiável)
    const supabase = await createClient()

    // Verificar duplicatas de telefone e email
    const { data: existingUsers, error: checkError } = await supabase
      .from('client_users')
      .select('id, phone, email')
      .or(`phone.eq.${normalizedPhone},email.eq.${normalizedEmail}`)

    if (checkError) {
      console.error('[LOGIN-CLIENTE] Erro ao verificar duplicatas:', checkError)
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Erro interno do servidor'
      }, { status: 500 })
    }

    if (existingUsers && existingUsers.length > 0) {
      const phoneExists = existingUsers.some(u => u.phone === normalizedPhone)
      const emailExists = existingUsers.some(u => u.email === normalizedEmail)
      
      if (phoneExists) {
        return NextResponse.json<AuthResponse>({
          success: false,
          error: 'Este número de telefone já está registrado'
        }, { status: 409 })
      }
      
      if (emailExists) {
        return NextResponse.json<AuthResponse>({
          success: false,
          error: 'Este email já está registrado'
        }, { status: 409 })
      }
    }

    // Hash da password com salt robusto
    const saltRounds = 12 // Mais seguro que o padrão 10
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Preparar dados para inserção
    const userData = {
      phone: normalizedPhone,
      email: normalizedEmail,
      first_name: normalizedFirstName,
      last_name: normalizedLastName,
      password: passwordHash, // Campo correto na BD é 'password', não 'password_hash'
      postal_code: normalizedPostalCode,
      birth_date: birth_date || null,
      gender: gender || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Inserir utilizador na BD
    const { data: newUser, error: insertError } = await supabase
      .from('client_users')
      .insert([userData])
      .select('id, phone, email, first_name, last_name, birth_date, postal_code, gender, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('[LOGIN-CLIENTE] Erro ao inserir utilizador:', insertError)
      
      // Tratamento específico de erros comuns
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json<AuthResponse>({
          success: false,
          error: 'Telefone ou email já registrado'
        }, { status: 409 })
      }
      
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Erro ao criar conta',
        details: insertError.message
      }, { status: 500 })
    }

    if (!newUser) {
      return NextResponse.json<AuthResponse>({
        success: false,
        error: 'Falha ao criar utilizador'
      }, { status: 500 })
    }

    // Tentativa de registo no Supabase Auth (opcional)
    try {
      const { error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: password,
        options: {
          data: {
            first_name: normalizedFirstName,
            last_name: normalizedLastName,
            phone: normalizedPhone
          }
        }
      })

      if (authError) {
        console.warn('[LOGIN-CLIENTE] Aviso: Falha no registo Supabase Auth:', authError.message)
        // Continuar mesmo com falha no auth - temos os dados na BD
      }
    } catch (authErr) {
      console.warn('[LOGIN-CLIENTE] Auth Supabase falhou:', authErr)
      // Continuar sem auth Supabase
    }

    // Sucesso - resetar rate limit para este IP
    registrationAttempts.delete(ip)

    return NextResponse.json<AuthResponse>({
      success: true,
      user: newUser
    })

  } catch (error) {
    console.error('[LOGIN-CLIENTE] Erro no registo:', error)
    return NextResponse.json<AuthResponse>({
      success: false,
      error: 'Erro interno do servidor'
    }, { status: 500 })
  }
} 