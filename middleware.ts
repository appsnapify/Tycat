import { NextRequest, NextResponse } from 'next/server'
// import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs' // REMOVIDO
import { createServerClient, type CookieOptions } from '@supabase/ssr' // ADICIONADO

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
  console.log(`[Middleware:normalizeRole] Papel não reconhecido: ${roleLower}, usando valor original ou 'desconhecido'`);
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
        return '/app/promotor/equipes';
      }
    case 'organizador':
      return '/app/organizador/dashboard';
    default:
      console.log(`[Middleware:getDashboardUrlByRole] Papel não reconhecido: ${role}, redirecionando para /app`);
      return '/app';
  }
};

// Middleware de autenticação para controlar acesso a rotas protegidas
export async function middleware(req: NextRequest) {
  // Criar uma resposta inicial que pode ser modificada
  let res = NextResponse.next({
    request: {
      headers: new Headers(req.headers), // Clonar headers para modificação segura
    },
  })

  // Verificar se estamos em ambiente de desenvolvimento e acessando a rota de envio de email
  if (process.env.NODE_ENV === 'development' && 
      req.nextUrl.pathname.startsWith('/api/send-welcome-email')) {
    if (!process.env.RESEND_API_KEY) {
      console.error('⚠️ RESEND_API_KEY não está configurada! Email não será enviado.')
      return NextResponse.json(
        { 
          success: false, 
          error: 'API Key do Resend não configurada', 
          hint: 'Verifique se RESEND_API_KEY está presente no .env.local'
        },
        { status: 500 }
      )
    }
  }
  
  const pathname = req.nextUrl.pathname;
  
  console.log(`[Middleware] Interceptando requisição para URL: ${pathname}`)

  // Permitir acesso direto a rotas públicas específicas dentro de /app
  const publicAppRoutes = ['/app/dashboard1']; // Adicione outras rotas se necessário
  if (publicAppRoutes.includes(pathname)) {
    console.log(`[Middleware] Rota pública ${pathname} permitida sem autenticação.`);
    return res; // Permite o acesso
  }

  // Verificar se já existe um redirecionamento
  const requestHeaders = new Headers(req.headers)
  const redirectUrlHeader = requestHeaders.get('x-middleware-rewrite')
  
  if (redirectUrlHeader) {
    console.log(`[Middleware] Redirecionamento já configurado para: ${redirectUrlHeader}`)
    return res
  }
  
  // Log para depuração de cookies e headers ANTES de getSession
  console.log('[Middleware] Request Headers:', Object.fromEntries(req.headers.entries()));
  console.log('[Middleware] Cookies on request:', req.cookies.getAll());
  
  // Criar cliente Supabase usando createServerClient de @supabase/ssr
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // Se o middleware precisar definir cookies, ele os adicionará à resposta.
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          // Se o middleware precisar remover cookies, ele os adicionará à resposta.
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )
  
  const { data: { session } } = await supabase.auth.getSession()
  console.log('[Middleware] Session object from getSession() using @supabase/ssr:', session);
  
  // Verificar se o usuário está autenticado
  if (!session) {
    console.log(`[Middleware] Usuário não autenticado (via @supabase/ssr). Redirecting to /login`)
    
    // Se estiver acessando uma rota protegida, redirecionar para login
    if (req.nextUrl.pathname.startsWith('/app')) {
      const redirectUrl = new URL('/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    return res
  }
  
  // Log para depuração
  console.log(`[Middleware] Usuário autenticado (via @supabase/ssr): ${session.user.email}`)
  console.log('[Middleware] Metadados do usuário (via @supabase/ssr):', JSON.stringify(session.user.user_metadata))
  
  // Definir papel base do usuário e normalizar
  let userRole = normalizeRole(session.user.user_metadata?.role || 'desconhecido')
  console.log(`[Middleware] Papel normalizado do usuário (inicial): ${userRole}`)
  
  // Verificar compatibilidade: se tiver flag is_team_leader mas não tiver role=chefe-equipe
  if (session.user.user_metadata?.is_team_leader === true && userRole !== 'chefe-equipe') {
    console.log('[Middleware] Compatibilidade: Usuário marcado como líder pelo flag is_team_leader');
    userRole = 'chefe-equipe'; // Atualizar o userRole
  }
  
  // Verificar equipe nos metadados e ajustar papel se for líder de equipe
  // Esta lógica também deve ser considerada para o userRole usado no redirecionamento
  if (session.user.user_metadata?.team_id) {
    console.log(`[Middleware] Usuário pertence à equipe ID: ${session.user.user_metadata.team_id}`);
    const teamRole = session.user.user_metadata.team_role?.toLowerCase() || '';
    if ((teamRole === 'leader' || teamRole === 'chefe') && userRole !== 'chefe-equipe') {
      console.log('[Middleware] Detectado inconsistência: usuário é líder na equipe mas papel principal não é chefe-equipe. Ajustando papel.');
      userRole = 'chefe-equipe';
    }
  }
  console.log(`[Middleware] Papel normalizado do usuário (final, após verificações de compatibilidade): ${userRole}`);

  // NOVO: Redirecionar usuários autenticados de /login e /register
  if (pathname === '/login' || pathname === '/register') {
    const redirectTo = getDashboardUrlByRole(userRole, session.user.user_metadata);
    console.log(`[Middleware] Usuário autenticado (${session.user.email}, papel: ${userRole}) acessando ${pathname}. Redirecionando para ${redirectTo}`);
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }
  
  // Adicionar headers à *requisição* que será encaminhada para o servidor de origem (página/rota Next.js)
  // Isto é feito clonando os headers da requisição original e adicionando novos.
  // A `res` já foi criada com estes headers clonados.
  res.headers.set('x-user-role', userRole)
  res.headers.set('x-user-email', session.user.email || '')
  res.headers.set('x-user-id', session.user.id || '')
  
  // Controle de acesso baseado em papel
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/app/')
  
  if (isProtectedRoute) {
    console.log(`[Middleware] Verificando acesso para rota protegida: ${req.nextUrl.pathname}`)
    
    // Caso especial: Se for promotor tentando acessar o dashboard, verificar se tem equipe
    if (userRole === 'promotor' && req.nextUrl.pathname === '/app/promotor/dashboard') {
      if (!session.user.user_metadata?.team_id) {
        console.log('[Middleware] Promotor sem equipe tentando acessar dashboard, redirecionando para página de equipes')
        const redirectUrl = new URL('/app/promotor/equipes', req.url)
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    const organizadorRoutes = ['/app/organizador']
    const promotorRoutes = ['/app/promotor']
    const teamLeaderRoutes = ['/app/chefe-equipe']
    
    // Mapear papéis para as rotas permitidas
    const roleToRoutes: Record<string, string[]> = {
      'organizador': organizadorRoutes,
      'promotor': [...promotorRoutes], // Promotor não pode mais acessar rotas de chefe-equipe
      'chefe-equipe': [...promotorRoutes, ...teamLeaderRoutes] // chefe-equipe pode acessar rotas de promotor
    }
    
    // Exceções para páginas específicas
    const anyRoleAllowedRoutes = [
      '/app/perfil',
      '/app/configuracoes',
      '/app/dashboard'
    ]
    
    // Verificar exceções primeiro
    const isExceptionRoute = anyRoleAllowedRoutes.some(route => 
      req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(`${route}/`)
    )
    
    if (isExceptionRoute) {
      console.log(`[Middleware] Rota de exceção permitida para qualquer papel: ${req.nextUrl.pathname}`)
      return res
    }
    
    // Obter rotas permitidas para o papel do usuário
    const allowedRoutes = roleToRoutes[userRole] || []
    
    // Verificar se o usuário pode acessar a rota atual
    const canAccess = allowedRoutes.some(route => req.nextUrl.pathname.startsWith(route))
    
    console.log(`[Middleware] Papel: ${userRole}, Rota: ${req.nextUrl.pathname}, Acesso permitido: ${canAccess}`)
    
    if (!canAccess) {
      // Se não puder acessar, redirecionar para o dashboard apropriado
      const redirectTo = getDashboardUrlByRole(userRole, session.user.user_metadata)
      
      console.log(`[Middleware] Redirecionando para: ${redirectTo}`)
      const redirectUrl = new URL(redirectTo, req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  return res // Retorna a resposta (potencialmente com cookies atualizados se supabase.auth.getSession os refrescou)
}

// Configurar quais caminhos este middleware deve ser executado
export const config = {
  matcher: [
    // Matcher original que estava a funcionar
    '/app/:path*',
    '/login',
    '/register',
  ],
} 