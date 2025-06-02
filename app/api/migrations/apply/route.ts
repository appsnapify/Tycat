import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar se é admin/organizador
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'organizador'].includes(profile.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente' }, { status: 403 })
    }

    console.log('Iniciando criação de tabelas do sistema scanner...')

    // Criar tabela event_scanners
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS event_scanners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
          created_by UUID NOT NULL REFERENCES profiles(id),
          scanner_name VARCHAR(100) NOT NULL,
          username VARCHAR(50) NOT NULL,
          password_hash TEXT NOT NULL,
          access_token TEXT UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          max_concurrent_sessions INTEGER DEFAULT 1,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_activity TIMESTAMPTZ,
          device_info JSONB DEFAULT '{}',
          CONSTRAINT unique_event_username UNIQUE(event_id, username)
        );
      `
    })

    console.log('Tabela event_scanners criada')

    // Criar tabela scanner_sessions
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS scanner_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          scanner_id UUID NOT NULL REFERENCES event_scanners(id) ON DELETE CASCADE,
          start_time TIMESTAMPTZ DEFAULT NOW(),
          end_time TIMESTAMPTZ,
          session_token TEXT UNIQUE NOT NULL,
          device_fingerprint TEXT,
          ip_address INET,
          user_agent TEXT,
          total_scans INTEGER DEFAULT 0,
          successful_scans INTEGER DEFAULT 0,
          offline_scans INTEGER DEFAULT 0,
          last_sync TIMESTAMPTZ DEFAULT NOW(),
          is_active BOOLEAN DEFAULT true
        );
      `
    })

    console.log('Tabela scanner_sessions criada')

    // Criar tabela scan_logs
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS scan_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id UUID NOT NULL REFERENCES scanner_sessions(id) ON DELETE CASCADE,
          guest_id UUID REFERENCES guests(id),
          scan_time TIMESTAMPTZ DEFAULT NOW(),
          scan_method VARCHAR(20) NOT NULL,
          scan_result VARCHAR(20) NOT NULL,
          qr_code_raw TEXT,
          search_query TEXT,
          was_offline BOOLEAN DEFAULT false,
          sync_time TIMESTAMPTZ,
          scanner_notes TEXT,
          error_details TEXT
        );
      `
    })

    console.log('Tabela scan_logs criada')

    // Criar índices
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_event_scanners_event_id ON event_scanners(event_id);
        CREATE INDEX IF NOT EXISTS idx_scanner_sessions_scanner_id ON scanner_sessions(scanner_id);
        CREATE INDEX IF NOT EXISTS idx_scanner_sessions_token ON scanner_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_scan_logs_session_id ON scan_logs(session_id);
      `
    })

    console.log('Índices criados')
    
    return NextResponse.json({
      success: true,
      message: 'Tabelas do sistema scanner criadas com sucesso' 
    })
    
  } catch (error) {
    console.error('Erro ao criar tabelas:', error)
    return NextResponse.json({
      error: 'Erro interno do servidor',
      details: error
    }, { status: 500 })
  }
} 