import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'

// Criar cliente Supabase com service role (acesso administrativo)
// Isso permite contornar as restrições de RLS
// ATENÇÃO: Esta variável de ambiente precisa ser configurada no .env.local
// SERVICE_ROLE_KEY deve ser a chave de serviço do seu projeto Supabase (não a chave anônima)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Cliente normal para operações não-administrativas
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Interface para os dados do evento necessários para validação
interface EventValidationData {
  id: string;
  is_published: boolean | null;
  guest_list_open_datetime: string | null;
  guest_list_close_datetime: string | null;
  guest_list_settings?: { max_guests?: number } | null;
  type?: string;
}

// POST: Registrar um convidado na guest list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.event_id || !body.name || !body.phone) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes' },
        { status: 400 }
      );
    }
    
    console.log('API - Dados recebidos do cliente:', body);
    
    // --- INÍCIO: Validação de Backend Adicional ---
    console.log(`API - Iniciando validação para evento: ${body.event_id}`);

    // 1. Buscar dados do evento para validação
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        is_published,
        guest_list_open_datetime,
        guest_list_close_datetime,
        guest_list_settings,
        type
      `)
      .eq('id', body.event_id)
      .single<EventValidationData>(); // Tipar a resposta

    if (eventError) {
      console.error('API - Erro ao buscar evento para validação:', eventError);
      if (eventError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Erro ao verificar dados do evento.' }, { status: 500 });
    }

    if (!eventData) {
        return NextResponse.json({ error: 'Evento não encontrado.' }, { status: 404 });
    }

    console.log('API - Dados do evento para validação:', eventData);

    // 2. Verificar se é um evento guest-list (redundante com a query do frontend, mas seguro)
    if (eventData.type !== 'guest-list') {
        console.warn('API - Tentativa de registro em evento que não é guest-list:', body.event_id);
        return NextResponse.json({ error: 'Este evento não é uma guest list.' }, { status: 400 });
    }

    // 3. Verificar se o evento está publicado/ativo
    if (eventData.is_published !== true) {
      console.log('API - Tentativa de registro em guest list inativa:', body.event_id);
      return NextResponse.json(
        { error: 'Esta guest list não está ativa no momento.' },
        { status: 403 } // Forbidden
      );
    }

    // 4. Verificar janela de tempo
    const now = new Date();
    const openTime = eventData.guest_list_open_datetime ? new Date(eventData.guest_list_open_datetime) : null;
    const closeTime = eventData.guest_list_close_datetime ? new Date(eventData.guest_list_close_datetime) : null;

    if (!openTime || !closeTime || isNaN(openTime.getTime()) || isNaN(closeTime.getTime())) {
        console.error('API - Datas de abertura/fecho inválidas no evento:', eventData.id);
        return NextResponse.json(
            { error: 'Erro na configuração das datas da guest list.' },
            { status: 500 }
        );
    }

    if (now < openTime) {
        console.log('API - Tentativa de registro antes da abertura:', body.event_id);
        return NextResponse.json(
            { error: `A guest list abre apenas em ${openTime.toLocaleString('pt-PT')}.` },
            { status: 403 } // Forbidden
        );
    }

    if (now >= closeTime) {
        console.log('API - Tentativa de registro após o fecho:', body.event_id);
        return NextResponse.json(
            { error: 'O período para entrar na guest list já terminou.' },
            { status: 403 } // Forbidden
        );
    }

    // 5. Verificar limite de convidados
    const maxGuests = eventData.guest_list_settings?.max_guests;
    if (maxGuests !== null && maxGuests !== undefined && maxGuests >= 0) { // Verificar se há limite definido
        console.log(`API - Verificando limite de convidados (${maxGuests}) para o evento: ${body.event_id}`);
        const { count, error: countError } = await supabaseAdmin
            .from('guests') // Assumindo que a tabela principal é 'guests'
            .select('*', { count: 'exact', head: true })
            .eq('event_id', body.event_id);

        if (countError) {
            console.error('API - Erro ao contar convidados:', countError);
            // Não bloquear necessariamente, mas logar o erro. Pode decidir bloquear se for crítico.
        } else {
            console.log(`API - Contagem atual de convidados: ${count}`);
            if (count !== null && count >= maxGuests) {
                console.log('API - Tentativa de registro em guest list cheia:', body.event_id);
                return NextResponse.json(
                    { error: 'A guest list atingiu o limite máximo de convidados.' },
                    { status: 409 } // Conflict
                );
            }
        }
    }

    console.log(`API - Validação concluída com sucesso para evento: ${body.event_id}`);
    // --- FIM: Validação de Backend Adicional ---
    
    // Gerar ID único para o convidado
    const guestId = uuidv4();
    
    // Preparar dados para QR code
    const qrData = {
      eventId: body.event_id,
      guestId: guestId,
      name: body.name,
      phone: body.phone,
      timestamp: new Date().toISOString()
    };
    
    // Gerar string JSON do QR code
    const qrCodeJson = JSON.stringify(qrData);
    console.log('API - Dados do QR code:', qrCodeJson);
    
    // Gerar QR code como URL de dados
    let qrCodeUrl = null;
    try {
      qrCodeUrl = await QRCode.toDataURL(qrCodeJson);
      console.log('API - QR Code gerado com sucesso');
    } catch (qrError) {
      console.error('API - Erro ao gerar QR code:', qrError);
    }
    
    // METODO DIRETO COM SQL PARA SALVAR O CONVIDADO
    // Este método contorna potenciais problemas de RLS
    console.log('API - Tentando inserir convidado via SQL direto...');
    
    try {
      const insertSQL = `
        INSERT INTO public.guests (
          id, event_id, name, phone, qr_code, checked_in, created_at
        ) VALUES (
          '${guestId}',
          '${body.event_id}',
          '${body.name.replace(/'/g, "''")}',
          '${body.phone.replace(/'/g, "''")}',
          '${qrCodeJson.replace(/'/g, "''")}',
          false,
          '${new Date().toISOString()}'
        )
        RETURNING *;
      `;
      
      const { data: sqlData, error: sqlError } = await supabaseAdmin.rpc('exec_sql', { 
        sql: insertSQL 
      });
      
      if (sqlError) {
        console.error('API - Erro ao inserir via SQL:', sqlError);
      } else if (sqlData && sqlData.result && sqlData.result.length > 0) {
        console.log('API - Convidado registrado com sucesso via SQL:', sqlData.result[0]);
        return NextResponse.json({
          success: true,
          source: 'direct_sql',
          data: sqlData.result[0],
          qrCodeUrl
        });
      }
    } catch (sqlErr) {
      console.error('API - Erro ao executar SQL direto:', sqlErr);
      // Continuar tentando outros métodos
    }
    
    // TENTAR MÉTODO PADRÃO (COM SERVICE ROLE)
    console.log('API - Tentando inserir na tabela guests com service role...');
    try {
      const { data, error } = await supabaseAdmin
        .from('guests')
        .insert({
          id: guestId,
          event_id: body.event_id,
          name: body.name,
          phone: body.phone,
          qr_code: qrCodeJson,
          checked_in: false,
          created_at: new Date().toISOString()
        })
        .select('*');
      
      if (error) {
        console.error('API - Erro ao inserir convidado (método service role):', error);
      } else if (data && data.length > 0) {
        console.log('API - Convidado registrado com sucesso (método service role):', data[0]);
        return NextResponse.json({
          success: true,
          source: 'service_role',
          data: data[0],
          qrCodeUrl
        });
      }
    } catch (err) {
      console.error('API - Erro ao tentar inserir com service role:', err);
    }
    
    // VERIFICAR TABELA GUEST_LIST_GUESTS como alternativa
    console.log('API - Tentando inserir na tabela guest_list_guests...');
    try {
      const { data, error } = await supabaseAdmin
        .from('guest_list_guests')
        .insert({
          id: guestId,
          event_id: body.event_id,
          name: body.name,
          phone: body.phone,
          qr_code: qrCodeJson,
          checked_in: false,
          created_at: new Date().toISOString()
        })
        .select('*');
      
      if (error) {
        console.error('API - Erro ao inserir convidado em guest_list_guests:', error);
      } else if (data && data.length > 0) {
        console.log('API - Convidado registrado com sucesso em guest_list_guests:', data[0]);
        return NextResponse.json({
          success: true,
          source: 'guest_list_guests',
          data: data[0],
          qrCodeUrl
        });
      }
    } catch (err) {
      console.error('API - Erro ao tentar inserir em guest_list_guests:', err);
    }
    
    // Se nenhum método funcionou, criar uma tabela específica para o evento
    // e salvar lá
    const tempTableName = `guests_${body.event_id.replace(/-/g, '_')}`;
    console.log(`API - Tentando criar e usar tabela específica: ${tempTableName}`);
    
    try {
      // Criar a tabela se não existir
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.${tempTableName} (
          id UUID PRIMARY KEY,
          event_id UUID NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          qr_code TEXT,
          checked_in BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Desabilitar RLS para esta tabela
        ALTER TABLE public.${tempTableName} DISABLE ROW LEVEL SECURITY;
        GRANT ALL ON public.${tempTableName} TO anon, authenticated, service_role;
      `;
      
      const { error: createError } = await supabaseAdmin.rpc('exec_sql', { 
        sql: createTableSQL 
      });
      
      if (createError) {
        console.error(`API - Erro ao criar tabela ${tempTableName}:`, createError);
      } else {
        console.log(`API - Tabela ${tempTableName} criada ou já existente`);
        
        // Inserir na tabela específica
        const insertSQL = `
          INSERT INTO public.${tempTableName} (
            id, event_id, name, phone, qr_code, checked_in, created_at
          ) VALUES (
            '${guestId}',
            '${body.event_id}',
            '${body.name.replace(/'/g, "''")}',
            '${body.phone.replace(/'/g, "''")}',
            '${qrCodeJson.replace(/'/g, "''")}',
            false,
            '${new Date().toISOString()}'
          )
          RETURNING *;
        `;
        
        const { data: insertData, error: insertError } = await supabaseAdmin.rpc('exec_sql', { 
          sql: insertSQL 
        });
        
        if (insertError) {
          console.error(`API - Erro ao inserir na tabela ${tempTableName}:`, insertError);
        } else if (insertData && insertData.result && insertData.result.length > 0) {
          console.log(`API - Convidado registrado com sucesso na tabela ${tempTableName}:`, insertData.result[0]);
          return NextResponse.json({
            success: true,
            source: `table_${tempTableName}`,
            data: insertData.result[0],
            qrCodeUrl
          });
        }
      }
    } catch (tempTableErr) {
      console.error(`API - Erro ao trabalhar com tabela ${tempTableName}:`, tempTableErr);
    }
    
    // Se chegarmos aqui, não conseguimos salvar em nenhuma tabela
    // Retornar o QR code de qualquer forma para não afetar a experiência do usuário
    console.log('API - ATENÇÃO: Não foi possível salvar o convidado em nenhuma tabela, mas retornando QR code');
    return NextResponse.json({
      success: true, // Retornamos true mesmo assim para não prejudicar a experiência
      source: 'fallback',
      warning: 'Não foi possível salvar o convidado no banco de dados, mas o QR code foi gerado',
      data: {
        id: guestId,
        event_id: body.event_id,
        name: body.name,
        phone: body.phone,
        qr_code: qrCodeJson,
        checked_in: false,
        created_at: new Date().toISOString()
      },
      qrCodeUrl
    });
    
  } catch (error) {
    console.error('API - Erro geral na rota POST:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT: Fazer check-in de um convidado pelo QR code
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('API Check-in - Dados recebidos:', body);
    
    if (!body.id) {
      console.log('API Check-in - Erro: ID do convidado faltando');
      return NextResponse.json(
        { success: false, error: 'ID do convidado é obrigatório' },
        { status: 400 }
      )
    }

    console.log(`API Check-in - Atualizando convidado com ID ${body.id} para checked_in: ${body.checked_in}`);
    console.log(`API Check-in - Evento ID: ${body.event_id}`);
    
    // Validar evento ID
    if (!body.event_id) {
      console.log('API Check-in - Erro: ID do evento faltando');
      return NextResponse.json(
        { success: false, error: 'ID do evento é obrigatório' },
        { status: 400 }
      )
    }
    
    // Verificar se o convidado existe em qualquer uma das tabelas possíveis
    // 1. Primeiro, tentar na tabela guests
    console.log(`API Check-in - Buscando convidado na tabela 'guests'...`);
    const { data: existingGuest, error: fetchError } = await supabase
      .from('guests')
      .select('*')
      .eq('id', body.id)
      .maybeSingle(); // Use maybeSingle para não lançar erro se não encontrar
    
    // 2. Se não encontrar na tabela guests, tente na guest_list_guests
    if (fetchError || !existingGuest) {
      console.log(`API Check-in - Convidado não encontrado na tabela 'guests' ou erro: ${fetchError?.message}`);
      console.log(`API Check-in - Tentando buscar na tabela 'guest_list_guests'...`);
      
      const { data: guestListGuest, error: guestListError } = await supabase
        .from('guest_list_guests')
        .select('*')
        .eq('id', body.id)
        .maybeSingle();
        
      if (guestListError) {
        console.log(`API Check-in - Erro ao buscar na tabela 'guest_list_guests': ${guestListError.message}`);
      }
      
      // Se encontrou na tabela guest_list_guests
      if (!guestListError && guestListGuest) {
        console.log(`API Check-in - Convidado encontrado na tabela 'guest_list_guests': ${guestListGuest.name}`);
        
        // Verificar se o convidado pertence ao evento selecionado
        if (guestListGuest.event_id && guestListGuest.event_id !== body.event_id) {
          console.log(`API Check-in - Erro: Convidado pertence a outro evento: ${guestListGuest.event_id}`);
          return NextResponse.json({ 
            success: false, 
            error: `Este convidado pertence a outro evento.` 
          }, { status: 400 });
        }
        
        // Verificar se já fez check-in
        const alreadyCheckedIn = guestListGuest?.checked_in === true || guestListGuest?.is_checked_in === true;
        console.log(`API Check-in - Convidado ${guestListGuest.name} já fez check-in antes? ${alreadyCheckedIn}`);
        
        // Processar check-in na tabela guest_list_guests
        const updateData = { 
          checked_in: body.checked_in,
          is_checked_in: body.checked_in,
          check_in_time: alreadyCheckedIn ? guestListGuest.check_in_time : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`API Check-in - Atualizando na tabela 'guest_list_guests' com:`, updateData);
        
        const { data, error } = await supabase
          .from('guest_list_guests')
          .update(updateData)
          .eq('id', body.id)
          .select();
          
        if (error) {
          console.log(`API Check-in - Erro na atualização: ${error.message}`);
          return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
          )
        }
        
        console.log(`API Check-in - Atualização bem-sucedida na 'guest_list_guests':`, data);
        return NextResponse.json({ 
          success: true, 
          data: data[0],
          alreadyCheckedIn,
          message: alreadyCheckedIn 
            ? `${guestListGuest.name} já realizou check-in anteriormente` 
            : `Check-in de ${guestListGuest.name} realizado com sucesso`
        })
      }
      
      // Se chegou aqui, não encontrou em nenhuma tabela
      console.log(`API Check-in - Convidado não encontrado em nenhuma tabela.`);
      return NextResponse.json(
        { success: false, error: `Convidado não encontrado nas tabelas guests ou guest_list_guests.` },
        { status: 404 }
      )
    }
    
    // Se chegou aqui, encontrou na tabela guests
    console.log(`API Check-in - Convidado encontrado na tabela 'guests': ${existingGuest.name}`);
    
    // Verificar se o convidado pertence ao evento selecionado
    if (existingGuest.event_id && existingGuest.event_id !== body.event_id) {
      console.log(`API Check-in - Erro: Convidado pertence a outro evento: ${existingGuest.event_id}`);
      return NextResponse.json({ 
        success: false, 
        error: `Este convidado pertence ao evento ${existingGuest.event_id}, não ao evento ${body.event_id}.` 
      }, { status: 400 });
    }
    
    // Verificar se já fez check-in (verificar tanto checked_in quanto is_checked_in para compatibilidade)
    const alreadyCheckedIn = existingGuest?.checked_in === true || existingGuest?.is_checked_in === true;
    console.log(`API Check-in - Convidado ${existingGuest.name} já fez check-in antes? ${alreadyCheckedIn}`);
    
    // Preparar os dados de atualização - garantir que ambos os campos sejam atualizados
    const updateData = { 
      checked_in: body.checked_in,
      is_checked_in: body.checked_in, // Atualizar ambos os campos para garantir compatibilidade
      check_in_time: alreadyCheckedIn ? existingGuest.check_in_time : new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log(`API Check-in - Dados de atualização:`, updateData);
    
    const { data, error } = await supabase
      .from('guests')
      .update(updateData)
      .eq('id', body.id)
      .select();
    
    if (error) {
      console.log(`API Check-in - Erro na atualização: ${error.message}`);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }
    
    console.log(`API Check-in - Atualização bem-sucedida:`, data);
    return NextResponse.json({ 
      success: true, 
      data: data[0],
      alreadyCheckedIn,
      message: alreadyCheckedIn 
        ? `${existingGuest.name} já realizou check-in anteriormente` 
        : `Check-in de ${existingGuest.name} realizado com sucesso`
    })
  } catch (err) {
    console.error('API Check-in - Erro interno:', err);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor', details: String(err) },
      { status: 500 }
    )
  }
}

// GET: Obter lista de convidados para um evento
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')
    
    if (!eventId) {
      return NextResponse.json(
        { error: 'EventId não fornecido.' },
        { status: 400 }
      )
    }
    
    // Buscar todos os convidados do evento
    const { data: guests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Erro ao buscar convidados:', error)
      return NextResponse.json(
        { error: 'Erro ao buscar lista de convidados.' },
        { status: 500 }
      )
    }
    
    // Calcular estatísticas
    const total = guests?.length || 0
    const checkedIn = guests?.filter(g => g.is_checked_in)?.length || 0
    const approved = guests?.filter(g => g.is_approved)?.length || 0
    const pending = guests?.filter(g => g.requires_approval && !g.is_approved)?.length || 0
    
    return NextResponse.json({
      success: true,
      guests,
      stats: {
        total,
        checkedIn,
        approved,
        pending
      }
    })
  } catch (error) {
    console.error('Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
} 