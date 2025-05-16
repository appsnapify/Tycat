import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/adminClient';
import { normalizePhone, getPhoneVariations } from '@/lib/utils/phoneUtils';

// Schema de validação para o telefone
const phoneSchema = z.object({
  phone: z.string().min(8, "Telefone inválido")
});

export async function POST(request: Request) {
  try {
    console.log('[V2] Iniciando verificação de telefone');
    
    // Extrair body da requisição
    const body = await request.json();
    console.log('[V2] Dados recebidos:', { 
      phone: body.phone ? `${body.phone.substring(0, 3)}****` : 'não informado' 
    });
    
    // Validar dados
    const result = phoneSchema.safeParse(body);
    if (!result.success) {
      console.error('[V2] Erro de validação:', result.error.format());
      return NextResponse.json({ 
        success: false, 
        error: 'Dados inválidos', 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { phone } = result.data;
    
    // Normalizar o telefone para aumentar chances de encontrá-lo
    const normalizedPhone = normalizePhone(phone);
    console.log('[V2] Telefone normalizado:', normalizedPhone.substring(0, 5) + '****');
    
    // Inicializar cliente Supabase
    const supabase = createAdminClient();
    
    // IMPLEMENTAÇÃO DIRETA: Consultar diretamente a tabela de usuários
    // em vez de usar RPC ou funções personalizadas
    const { data, error } = await supabase
      .from('client_users')
      .select('id')
      .eq('phone', normalizedPhone)
      .maybeSingle();
    
    if (error) {
      console.error('[V2] Erro ao verificar telefone:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao verificar telefone' 
      }, { status: 500 });
    }
    
    // Se não encontrou com o telefone normalizado, tentar com variações
    if (!data) {
      console.log('[V2] Telefone não encontrado com formato padrão, tentando variações');
      
      // Gerar variações possíveis do número
      const variations = getPhoneVariations(normalizedPhone);
      console.log('[V2] Variações geradas:', variations.map(v => v.substring(0, 5) + '****'));
      
      // Construir consulta OR para todas as variações
      const orConditions = variations.map(v => `phone.eq.${v}`).join(',');
      
      const { data: varData, error: varError } = await supabase
        .from('client_users')
        .select('id')
        .or(orConditions)
        .maybeSingle();
      
      if (varError) {
        console.error('[V2] Erro ao verificar variações de telefone:', varError);
        return NextResponse.json({ 
          success: false, 
          error: 'Erro ao verificar telefone' 
        }, { status: 500 });
      }
      
      // Retornar resultado da busca por variações
      const exists = !!varData;
      console.log(`[V2] Telefone ${exists ? 'encontrado' : 'não encontrado'} nas variações`);
      
      return NextResponse.json({ 
        success: true, 
        exists: exists,
        userId: exists ? varData.id : null
      });
    }
    
    // Retornar resultado da busca direta
    console.log(`[V2] Telefone encontrado no sistema com ID:`, data.id);
    return NextResponse.json({ 
      success: true, 
      exists: true,
      userId: data.id
    });
    
  } catch (error) {
    console.error('[V2] Erro ao processar requisição:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 