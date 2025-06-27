import { NextRequest, NextResponse } from 'next/server'
// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs' // REMOVIDO
import { createServerClient, type CookieOptions } from '@supabase/ssr' // ADICIONADO
import { getRoleRedirectUrl, normalizeRole, hasRoutePermission } from '@/lib/utils/role-redirect'
// import { rateLimit } from './lib/security/rate-limit' // TEMPORARIAMENTE DESABILITADO

// Definir função de normalização para consistência entre banco e frontend
const roleMappings: Record<string, string> = {
  'promoter': 'promotor',
  'team-leader': 'chefe-equipe',
  'chefe-equipe': 'chefe-equipe',
  'organizador': 'organizador',
  'organizer': 'organizador'
};

const normalizeRoleMiddleware = (role: string | null | undefined): string => {
  if (!role) return 'desconhecido';
  const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
  const normalized = roleMappings[roleLower];
  if (normalized) {
    return normalized;
  }
  return typeof role === 'string' ? role : 'desconhecido';
};

// Função para obter URL do dashboard com base no papel
const getDashboardUrlByRole = (role: string, userMetadata?: any): string => {
  const normalizedRole = normalizeRoleMiddleware(role);
  
  switch (normalizedRole) {
    case 'chefe-equipe':
      return '/app/chefe-equipe/dashboard';
    case 'promotor':
      if (userMetadata?.team_id) {
        return '/app/promotor/dashboard';
      } else {
        return '/app/promotor/equipes/escolha';
      }
    case 'organizador':
      return '/app/organizador/dashboard';
    default:
      return '/app';
  }
};

// 🔒 RATE LIMITING TEMPORARIAMENTE DESABILITADO - estava causando timeouts
// const limiter = rateLimit({
//   interval: 60 * 1000, // 1 minuto
//   uniqueTokenPerInterval: 500
// });

// Middleware de autenticação para controlar acesso a rotas protegidas
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // 🔒 RATE LIMITING TEMPORARIAMENTE DESABILITADO - estava causando timeouts
  // if (pathname.startsWith('/promo') || pathname.startsWith('/api')) {
  //   try {
  //     await limiter.check(req, 10, req.ip || 'anonymous'); // 10 requests per minute
  //   } catch (error) {
  //     return new NextResponse('Rate limit exceeded', { status: 429 });
  //   }
  // }

  // Permitir acesso direto a rotas públicas específicas dentro de /app
  const publicAppRoutes = ['/app/dashboard1'];
  if (publicAppRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Criar uma resposta inicial que pode ser modificada
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers),
    },
  });

  // Criar cliente Supabase com configuração SIMPLES
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value: '',
            ...options,
          })
        }
      }
    }
  );
  
  try {
    // CORREÇÃO SEGURANÇA: Usar getUser() em vez de getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // Verificar se o usuário está autenticado
    if (!user || userError) {
      // Se estiver acessando uma rota protegida, redirecionar para login
      if (req.nextUrl.pathname.startsWith('/app')) {
        const redirectUrl = new URL('/login', req.url);
        return NextResponse.redirect(redirectUrl);
      }
      return res;
    }
    
    // Definir papel base do usuário e normalizar
    let userRole = normalizeRoleMiddleware(user.user_metadata?.role || 'desconhecido');
    
    // Verificar compatibilidade: se tiver flag is_team_leader mas não tiver role=chefe-equipe
    if (user.user_metadata?.is_team_leader === true && userRole !== 'chefe-equipe') {
      userRole = 'chefe-equipe';
    }
    
    // Verificar equipe nos metadados e ajustar papel se for líder de equipe
    if (user.user_metadata?.team_id) {
      const teamRole = user.user_metadata.team_role?.toLowerCase() || '';
      if ((teamRole === 'leader' || teamRole === 'chefe') && userRole !== 'chefe-equipe') {
        userRole = 'chefe-equipe';
      }
    }

    // Redirecionar usuários autenticados de /login e /register
    if (pathname === '/login' || pathname === '/register') {
      const redirectTo = getRoleRedirectUrl(userRole, user.user_metadata);
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
    
    // Adicionar headers à requisição
    res.headers.set('x-user-role', userRole);
    res.headers.set('x-user-email', user.email || '');
    res.headers.set('x-user-id', user.id || '');
    
    // Controle de acesso baseado em papel
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/app/');
    
    if (isProtectedRoute) {
      // VERIFICAÇÃO CRÍTICA: Bloquear acesso cruzado entre roles
      if (!hasRoutePermission(userRole, req.nextUrl.pathname)) {
        console.warn(`[MIDDLEWARE] 🚨 BLOCKED: User role '${userRole}' tentou acessar rota não autorizada: '${req.nextUrl.pathname}'`);
        const correctUrl = getRoleRedirectUrl(userRole, user.user_metadata);
        return NextResponse.redirect(new URL(correctUrl, req.url));
      }
      
      // Caso especial: Se for promotor tentando acessar o dashboard, verificar se tem equipe
      if (userRole === 'promotor' && req.nextUrl.pathname === '/app/promotor/dashboard') {
        if (!user.user_metadata?.team_id) {
          const redirectUrl = new URL('/app/promotor/equipes', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    }
    
  } catch (error) {
    console.error('Middleware error:', error);
    // Em caso de erro na sessão, redirecionar para login se for rota protegida
    if (req.nextUrl.pathname.startsWith('/app')) {
      const redirectUrl = new URL('/login', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }
  
  return res;
}

// Configurar quais caminhos este middleware deve ser executado
export const config = {
  matcher: [
    // Matcher original que estava a funcionar
    '/app/:path*',
    '/login',
    '/register',
    '/api/client-auth/:path*',
    '/api/guests/:path*',
    '/api/scanners/:path*',
    // '/promo/:path*', // TEMPORARIAMENTE REMOVIDO - estava causando problemas
  ],
} 