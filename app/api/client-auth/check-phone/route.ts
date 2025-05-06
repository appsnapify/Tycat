import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/phoneUtils';

// Cache simples em memória para armazenar verificações recentes
// Formato: {número: {exists: boolean, userId: string | null, timestamp: number}}
const phoneCache = new Map();

// Tempo de expiração do cache em milissegundos (10 minutos)
const CACHE_EXPIRY = 10 * 60 * 1000;

// Schema de validação para o telefone
const phoneSchema = z.object({
  phone: z.string().min(6).trim()
    .refine(val => /^\+?[0-9\s\-()]+$/.test(val), {
      message: 'Formato de telefone inválido. Deve incluir código do país (ex: +351)'
    })
});

export async function POST(request: Request) {
  console.log('Iniciando verificação de telefone...');
  try {
    // Criar cliente Supabase
    const supabase = await createClient();
    console.log('Cliente Supabase criado com sucesso');
    
    // Extrair e validar o corpo da requisição
    const body = await request.json();
    
    // Validar o telefone com zod
    const result = phoneSchema.safeParse(body);
    if (!result.success) {
      console.error('Telefone inválido:', result.error.format());
      return NextResponse.json(
        { error: 'Telefone inválido', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { phone } = result.data;
    console.log('Telefone recebido:', phone);
    
    // Normalizar o telefone
    const normalizedPhone = normalizePhone(phone);
    console.log('Telefone normalizado:', normalizedPhone);
    
    // Verificar no cache se o telefone já foi verificado recentemente
    const now = Date.now();
    const cachedResult = phoneCache.get(normalizedPhone);
    if (cachedResult && (now - cachedResult.timestamp < CACHE_EXPIRY)) {
      console.log('Resultado encontrado no cache:', cachedResult);
      return NextResponse.json({
        exists: cachedResult.exists,
        userId: cachedResult.userId
      });
    }
    
    try {
      // MÉTODO OTIMIZADO: Usar função SQL para verificação rápida
      console.log('Verificando telefone com função otimizada');
      const { data, error } = await supabase.rpc(
        'check_phone_exists',
        { phone_to_check: normalizedPhone }
      );
        
      if (error) {
        console.error('Erro ao verificar telefone com função otimizada:', error);
        throw error;
      }
      
      console.log('Resultado da verificação otimizada:', data);
      
      if (data && data.length > 0) {
        const checkResult = data[0];
        
        // Criar resultado para retorno e cache
      const result = {
          exists: checkResult.found, 
          userId: checkResult.found ? checkResult.user_id : null,
        timestamp: now
      };
      
        // Armazenar no cache
        phoneCache.set(normalizedPhone, result);
      
        // Retornar resultado
      return NextResponse.json({
        exists: result.exists,
        userId: result.userId
      });
      } else {
        // Nenhum resultado retornado é considerado como não encontrado
        const result = { exists: false, userId: null, timestamp: now };
        phoneCache.set(normalizedPhone, result);
      
        return NextResponse.json({
          exists: false,
          userId: null
        });
      }
    } catch (dbError) {
      console.error('Erro ao consultar banco de dados:', dbError);
      return NextResponse.json(
        { error: 'Erro ao verificar telefone no banco de dados' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro na verificação de telefone:', error);
    return NextResponse.json(
      { error: 'Falha ao processar solicitação de verificação de telefone' },
      { status: 500 }
    );
  }
} 