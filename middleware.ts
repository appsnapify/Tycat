import { NextRequest, NextResponse } from 'next/server'
// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs' // REMOVIDO
import { createServerClient, type CookieOptions } from '@supabase/ssr' // ADICIONADO
// import { rateLimit } from './lib/security/rate-limit'

// Definir função de normalização para consistência entre banco e frontend
const roleMappings: Record<string, string> = {
  'promoter': 'promotor',
  'team-leader': 'chefe-equipe',
  'chefe-equipe': 'chefe-equipe', // Mantém para o caso de já estar normalizado
  'organizador': 'organizador',
  'organizer': 'organizador'
};

const normalizeRole = (role: string | null | undefined): string => {
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
  const normalizedRole = normalizeRole(role);
  
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

// Configuração do rate limiting
// const limiter = rateLimit({
//   interval: 60 * 1000, // 1 minuto
//   uniqueTokenPerInterval: 500
// });

// Middleware de autenticação para controlar acesso a rotas protegidas
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Reduzir logging excessivo - apenas log essencial
  const isDebugMode = process.env.NODE_ENV === 'development' && pathname.startsWith('/app/');
  
  if (isDebugMode) {
    console.log(`[Middleware] ${pathname}`);
  }

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

  // Criar cliente Supabase com tratamento melhorado de cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            const cookie = req.cookies.get(name);
            if (!cookie?.value) return undefined;
            
            // Verificar se o cookie está em formato base64 e tentar decodificar
            if (cookie.value.startsWith('base64-')) {
              try {
                const base64Content = cookie.value.substring(7); // Remove 'base64-'
                const decoded = Buffer.from(base64Content, 'base64').toString('utf-8');
                // Tentar parsear como JSON para verificar se é válido
                JSON.parse(decoded);
                return decoded;
              } catch (e) {
                // Se não conseguir decodificar, usar valor original
                return cookie.value;
              }
            }
            
            return cookie.value;
          } catch (e) {
            return undefined;
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            res.cookies.set({
              name,
              value,
              ...options,
              path: options.path || '/',
              sameSite: options.sameSite || 'lax',
              httpOnly: options.httpOnly !== false,
              secure: process.env.NODE_ENV === 'production'
            });
          } catch (e) {
            // Silenciosamente ignorar erros de cookie
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            res.cookies.set({
              name,
              value: '',
              ...options,
              path: options.path || '/',
              maxAge: 0,
              expires: new Date(0)
            });
          } catch (e) {
            // Silenciosamente ignorar erros de cookie
          }
        }
      }
    }
  );
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    // Verificar se o usuário está autenticado
    if (!session) {
      // Se estiver acessando uma rota protegida, redirecionar para login
      if (req.nextUrl.pathname.startsWith('/app')) {
        const redirectUrl = new URL('/login', req.url);
        return NextResponse.redirect(redirectUrl);
      }
      return res;
    }
    
    // Definir papel base do usuário e normalizar
    let userRole = normalizeRole(session.user.user_metadata?.role || 'desconhecido');
    
    // Verificar compatibilidade: se tiver flag is_team_leader mas não tiver role=chefe-equipe
    if (session.user.user_metadata?.is_team_leader === true && userRole !== 'chefe-equipe') {
      userRole = 'chefe-equipe';
    }
    
    // Verificar equipe nos metadados e ajustar papel se for líder de equipe
    if (session.user.user_metadata?.team_id) {
      const teamRole = session.user.user_metadata.team_role?.toLowerCase() || '';
      if ((teamRole === 'leader' || teamRole === 'chefe') && userRole !== 'chefe-equipe') {
        userRole = 'chefe-equipe';
      }
    }

    // Redirecionar usuários autenticados de /login e /register
    if (pathname === '/login' || pathname === '/register') {
      const redirectTo = getDashboardUrlByRole(userRole, session.user.user_metadata);
      return NextResponse.redirect(new URL(redirectTo, req.url));
    }
    
    // Adicionar headers à requisição
    res.headers.set('x-user-role', userRole);
    res.headers.set('x-user-email', session.user.email || '');
    res.headers.set('x-user-id', session.user.id || '');
    
    // Controle de acesso baseado em papel
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/app/');
    
    if (isProtectedRoute) {
      // Caso especial: Se for promotor tentando acessar o dashboard, verificar se tem equipe
      if (userRole === 'promotor' && req.nextUrl.pathname === '/app/promotor/dashboard') {
        if (!session.user.user_metadata?.team_id) {
          const redirectUrl = new URL('/app/promotor/equipes', req.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
      
      const organizadorRoutes = ['/app/organizador'];
      const promotorRoutes = ['/app/promotor'];
      const teamLeaderRoutes = ['/app/chefe-equipe'];
      
      // Mapear papéis para as rotas permitidas
      const roleToRoutes: Record<string, string[]> = {
        'organizador': organizadorRoutes,
        'promotor': [...promotorRoutes],
        'chefe-equipe': [...promotorRoutes, ...teamLeaderRoutes]
      };
      
      // Exceções para páginas específicas
      const anyRoleAllowedRoutes = [
        '/app/perfil',
        '/app/configuracoes',
        '/app/dashboard'
      ];
      
      // Verificar exceções primeiro
      const isExceptionRoute = anyRoleAllowedRoutes.some(route => 
        req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
      );
      
      if (isExceptionRoute) {
        return res;
      }
      
      // Obter rotas permitidas para o papel do usuário
      const allowedRoutes = roleToRoutes[userRole] || [];
      
      // Verificar se o usuário pode acessar a rota atual
      const canAccess = allowedRoutes.some(route => req.nextUrl.pathname.startsWith(route));
      
      if (!canAccess) {
        // Se não puder acessar, redirecionar para o dashboard apropriado
        const redirectTo = getDashboardUrlByRole(userRole, session.user.user_metadata);
        const redirectUrl = new URL(redirectTo, req.url);
        return NextResponse.redirect(redirectUrl);
      }
    }
    
  } catch (error) {
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
  ],
} 