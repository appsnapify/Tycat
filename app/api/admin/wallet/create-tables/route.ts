import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createTeamsTables, checkTeamsTables } from '../schema'

export async function GET(request: Request) {
  try {
    // Criando cliente Supabase usando a nova função de utilitário
    const supabase = createServiceClient();

    // Verificar se as tabelas já existem
    const { exists, error: checkError } = await checkTeamsTables(supabase)
    
    if (checkError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao verificar tabelas existentes', 
        error: checkError 
      }, { status: 500 })
    }
    
    if (exists) {
      return NextResponse.json({ 
        success: true, 
        message: 'As tabelas já existem', 
        created: false 
      }, { status: 200 })
    }
    
    // Criar as tabelas
    const { success, error } = await createTeamsTables(supabase)
    
    if (!success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao criar tabelas', 
        error 
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tabelas criadas com sucesso', 
      created: true 
    }, { status: 201 })
  } catch (error) {
    console.error('Erro ao processar solicitação:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor', 
      error 
    }, { status: 500 })
  }
} 