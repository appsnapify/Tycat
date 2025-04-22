import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

// Definir função de normalização para consistência entre banco e frontend
const normalizeRole = (role: string | null | undefined): string => {
  if (!role) return 'desconhecido';
  
  // Conversão para string e lowercase para comparação mais robusta
  const roleLower = typeof role === 'string' ? role.toLowerCase() : '';
  
  // Versão mais robusta do mapeamento
  if (roleLower === 'promoter') return 'promotor';
  if (roleLower === 'promotor') return 'promotor';
  if (roleLower === 'team-leader') return 'chefe-equipe';
  if (roleLower === 'chefe-equipe') return 'chefe-equipe';
  if (roleLower === 'organizador') return 'organizador';
  if (roleLower === 'organizer') return 'organizador';
  
  console.log(`[Middleware:normalizeRole] Papel não reconhecido: ${role}, usando valor original`);
  return role; // Se não mapeado, retorna o original
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
export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const pathname = request.nextUrl.pathname;
  
  console.log(`[Middleware] Interceptando requisição para URL: ${pathname}`)

  // Permitir acesso direto a rotas públicas específicas dentro de /app
  const publicAppRoutes = ['/app/dashboard1']; // Adicione outras rotas se necessário
  if (publicAppRoutes.includes(pathname)) {
    console.log(`[Middleware] Rota pública ${pathname} permitida sem autenticação.`);
    return response; // Permite o acesso
  }

  // Verificar se já existe um redirecionamento
  const requestHeaders = new Headers(request.headers)
  const redirectUrl = requestHeaders.get('x-middleware-rewrite')
  
  if (redirectUrl) {
    console.log(`[Middleware] Redirecionamento já configurado para: ${redirectUrl}`)
    return NextResponse.next()
  }
  
  // Obter a sessão do usuário
  const supabase = createMiddlewareClient({ req: request, res: response })
  const { data: { session } } = await supabase.auth.getSession()
  
  // Verificar se o usuário está autenticado
  if (!session) {
    console.log(`[Middleware] Usuário não autenticado. Redirecting to /login`)
    
    // Se estiver acessando uma rota protegida, redirecionar para login
    if (request.nextUrl.pathname.startsWith('/app')) {
      const redirectUrl = new URL('/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    return NextResponse.next()
  }
  
  // Log para depuração
  console.log(`[Middleware] Usuário autenticado: ${session.user.email}`)
  console.log('[Middleware] Metadados do usuário:', JSON.stringify(session.user.user_me))
  
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
  
  // Configurar headers com informações do usuário para logging e debugging
  requestHeaders.set('x-user-role', userRole)
  requestHeaders.set('x-user-email', session.user.email || '')
  requestHeaders.set('x-user-id', session.user.id || '')
  
  // Controle de acesso baseado em papel
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/app/')
  
  if (isProtectedRoute) {
    console.log(`[Middleware] Verificando acesso para rota protegida: ${request.nextUrl.pathname}`)
    
    // Caso especial: Se for promotor tentando acessar o dashboard, verificar se tem equipe
    if (userRole === 'promotor' && request.nextUrl.pathname === '/app/promotor/dashboard') {
      if (!session.user.user_metadata?.team_id) {
        console.log('[Middleware] Promotor sem equipe tentando acessar dashboard, redirecionando para página de equipes')
        const redirectUrl = new URL('/app/promotor/equipes', request.url)
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
      request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(`${route}/`)
    )
    
    if (isExceptionRoute) {
      console.log(`[Middleware] Rota de exceção permitida para qualquer papel: ${request.nextUrl.pathname}`)
      return NextResponse.next()
    }
    
    // Obter rotas permitidas para o papel do usuário
    const allowedRoutes = roleToRoutes[userRole] || []
    
    // Verificar se o usuário pode acessar a rota atual
    const canAccess = allowedRoutes.some(route => request.nextUrl.pathname.startsWith(route))
    
    console.log(`[Middleware] Papel: ${userRole}, Rota: ${request.nextUrl.pathname}, Acesso permitido: ${canAccess}`)
    
    if (!canAccess) {
      // Se não puder acessar, redirecionar para o dashboard apropriado
      const redirectTo = getDashboardUrlByRole(userRole, session.user.user_metadata)
      
      console.log(`[Middleware] Redirecionando para: ${redirectTo}`)
      const redirectUrl = new URL(redirectTo, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }
  
  // Atualizar headers da resposta para debugging
  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
  
  return res
}

// Configurar quais caminhos este middleware deve ser executado
export const config = {
  matcher: [
    // Restaurar matcher original para garantir que o middleware execute em /app/*
    '/app/:path*',
    '/login',
    '/register',
  ],
} 