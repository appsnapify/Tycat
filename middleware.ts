import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs' // REVERTIDO
// import { createServerClient, type CookieOptions } from '@supabase/ssr' // REMOVIDO

// Definir função de normalização para consistência entre banco e frontend
const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return 'desconhecido';
  
  // Conversão para string e lowercase para comparação mais robusta
  const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
  
  // Versão mais robusta do mapeamento
  if (roleLower === 'promoter') return 'promotor';
  if (roleLower === 'team-leader') return 'chefe-equipe';
  if (roleLower === 'chefe-equipe') return 'chefe-equipe';
  if (roleLower === 'organizador') return 'organizador';
  if (roleLower === 'organizer') return 'organizador';
  
  console.log(`[Middleware:normalizeRole] Papel não reconhecido: ${role}, usando valor original`);
  return typeof role === 'string' ? role : 'desconhecido'; // CORRIGIDO: retornar string ou 'desconhecido'
};

// Função para obter URL do dashboard com base no papel
const getDashboardUrlByRole = (role: string, userMetadata?: any): string => {
  const normalizedRole = normalizeRole(role);
  
  switch (normalizedRole) {
    case 'chefe-equipe':
      return '/app/chefe-equipe/dashboard';
    case 'promotor':
      // Verificar se o promotor tem uma equipe
      if (userMetadata?.team_id) {
        // Promotor com equipe vai para o dashboard
        return '/app/promotor/dashboard';
      } else {
        // Promotor sem equipe vai para a página de equipes
        // para escolher entre criar ou aderir a uma equipe
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
  const res = NextResponse.next() // REVERTIDO para a forma original de criar res
  
  // Verificar se estamos em ambiente de desenvolvimento e acessando a rota de envio de email
  if (process.env.NODE_ENV === 'development' && 
      req.nextUrl.pathname.startsWith('/api/send-welcome-email')) {
    
    // Verificar se a API key do Resend está configurada
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
  
  // Obter a sessão do usuário usando @supabase/auth-helpers-nextjs (REVERTIDO)
  const supabase = createMiddlewareClient({ req, res })
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Verificar se o usuário está autenticado
  if (!session) {
    console.log(`[Middleware] Usuário não autenticado. Redirecting to /login`)
    
    // Se estiver acessando uma rota protegida, redirecionar para login
    if (req.nextUrl.pathname.startsWith('/app')) {
      const redirectUrl = new URL('/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    return res
  }
  
  // Log para depuração
  console.log(`[Middleware] Usuário autenticado: ${session.user.email}`)
  console.log('[Middleware] Metadados do usuário:', JSON.stringify(session.user.user_metadata)) // CORRIGIDO user_metadata
  
  // Definir papel base do usuário e normalizar
  let userRole = normalizeRole(session.user.user_metadata?.role || 'desconhecido')
  console.log(`[Middleware] Papel normalizado do usuário: ${userRole}`)
  
  // Verificar compatibilidade: se tiver flag is_team_leader mas não tiver role=chefe-equipe
  if (session.user.user_metadata?.is_team_leader === true && userRole !== 'chefe-equipe') {
    console.log('[Middleware] Compatibilidade: Usuário marcado como líder pelo flag is_team_leader');
    // Atualizar o userRole para uso no middleware 
    userRole = 'chefe-equipe';
  }
  
  // Verificar equipe nos metadados
  if (session.user.user_metadata?.team_id) {
    console.log(`[Middleware] Usuário pertence à equipe ID: ${session.user.user_metadata.team_id}`);
    
    // Se o papel na equipe é 'leader' ou 'chefe' mas o papel geral não é 'chefe-equipe', ajustar
    const teamRole = session.user.user_metadata.team_role?.toLowerCase() || '';
    if ((teamRole === 'leader' || teamRole === 'chefe') && userRole !== 'chefe-equipe') {
      console.log('[Middleware] Detectado inconsistência: usuário é líder na equipe mas papel principal não é chefe-equipe');
      userRole = 'chefe-equipe';
    }
  }
  
  // Configurar headers com informações do usuário para logging e debugging (REVERTIDO para usar requestHeaders)
  requestHeaders.set('x-user-role', userRole)
  requestHeaders.set('x-user-email', session.user.email || '')
  requestHeaders.set('x-user-id', session.user.id || '')
  
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
  
  // Atualizar headers da resposta para debugging (REVERTIDO)
  const responseWithHeaders = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  return responseWithHeaders
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