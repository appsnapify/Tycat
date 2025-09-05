// ✅ SERVER COMPONENT PARA NEXT.JS APP ROUTER
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ticket, BarChart2, Users, Sparkles, Zap, Shield } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ✅ DADOS ESTÁTICOS DOS FEATURES
const featuresData = [
  {
    title: "Gestão de Eventos",
    description: "Crie e gerencie eventos de forma simples e eficiente com ferramentas intuitivas e poderosas.",
    icon: <Ticket className="h-6 w-6 text-emerald-600" />,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200"
  },
  {
    title: "Gestão de Equipas",
    description: "Coordene equipas e promotores numa única plataforma, mantendo todos alinhados e produtivos.",
    icon: <Users className="h-6 w-6 text-violet-600" />,
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200"
  },
  {
    title: "Analytics Inteligentes",
    description: "Acompanhe métricas em tempo real e tome decisões baseadas em dados concretos.",
    icon: <BarChart2 className="h-6 w-6 text-amber-600" />,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200"
  },
]

// ✅ FUNÇÃO PARA CRIAR CLIENTE SUPABASE SERVER-SIDE
async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Pode ser ignorado se houver middleware atualizando sessões
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
      } catch (error) {
            // Pode ser ignorado se houver middleware atualizando sessões
          }
        },
      },
    }
  )
}

// ✅ SERVER COMPONENT PRINCIPAL
export default async function HomePage() {
  // ✅ VERIFICAÇÃO DE AUTENTICAÇÃO NO SERVIDOR
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  // ✅ REDIRECT SE USUÁRIO LOGADO
  if (session?.user) {
    redirect('/app/organizador/dashboard')
  }

  // ✅ RENDERIZAÇÃO SERVER-SIDE PURA
  return (
    <div className="bg-white text-slate-900 min-h-screen">
      {/* ✅ HEADER SIMPLIFICADO */}
      <nav className="flex justify-between items-center py-3 px-4 border-slate-200 border-b sticky top-0 z-50 bg-white shadow-sm">
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-emerald-700 font-bold text-lg md:text-xl tracking-tight">TYCAT</Link>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex">
            Beta
          </Badge>
        </div>

        {/* ✅ BOTÕES SIMPLIFICADOS PARA EVITAR ERROS */}
        <div className="flex items-center space-x-2">
          <Link href="/login">
            <Button variant="ghost" className="text-sm text-slate-700 h-10 min-w-[80px] px-4">
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button className="bg-emerald-600 text-white text-sm px-6 h-10 min-w-[120px] shadow-sm">
              Começar Grátis
            </Button>
          </Link>
        </div>
      </nav>

      {/* ✅ HERO SECTION */}
      <section className="text-center pt-12 pb-16 md:pt-16 md:pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight tracking-tight">
              <span className="block">Gestão Completa de</span>
              <span className="text-emerald-700 block">Eventos</span>
              <span className="block mt-2">
                Simples e <span className="text-violet-700">Poderosa</span>
              </span>
            </h1>

            <p className="text-slate-700 mb-10 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
              Transforme a gestão dos seus eventos com ferramentas intuitivas para{" "}
              <span className="text-emerald-700 font-medium">guest lists</span>,{" "}
              <span className="text-violet-700 font-medium">venda de bilhetes</span> e{" "}
              <span className="text-amber-700 font-medium">relatórios detalhados</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/register">
                <Button size="lg" className="bg-emerald-600 text-white px-8 py-4 text-lg shadow-md min-w-[220px] min-h-[48px]">
              Começar Gratuitamente
                  <Zap className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-slate-200 text-slate-700 min-w-[200px] min-h-[48px]">
                  Ver Funcionalidades
            </Button>
          </Link>
            </div>
          </div>

          <div className="mt-16 relative">
            <div className="mx-auto max-w-4xl">
              <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
                <div className="bg-white rounded-xl shadow-md p-6 aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Ticket className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-600 text-lg">Dashboard Preview</p>
                    <p className="text-slate-700 text-sm mt-1">Em breve...</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ FEATURES SECTION */}
      <section id="features" className="py-20 md:py-28 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div>
              <Badge variant="outline" className="mb-4 bg-violet-50 text-violet-700 border-violet-200">
                <Shield className="w-4 h-4 mr-2" />
                Funcionalidades Principais
              </Badge>
              <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold mb-4 tracking-tight">
                Plataforma <span className="text-emerald-700">Completa</span> para{" "}
                <span className="text-violet-700">Organizadores</span>
              </h2>
              <p className="text-slate-700 text-lg md:text-xl max-w-2xl mx-auto">
                Todas as ferramentas que precisa numa única plataforma elegante e intuitiva.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => (
              <div key={feature.title} className="group">
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 h-full">
                  <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className={`mx-auto flex w-12 h-12 items-center justify-center rounded-xl border-t border-l ${feature.bgColor} ${feature.borderColor}`}>
                {feature.icon}
              </div>
                  </div>

                  <h3 className="text-xl font-semibold mb-3 text-center">
                {feature.title}
              </h3>
                  <p className="text-slate-700 text-center leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
          ))}
          </div>
        </div>
      </section>

      {/* ✅ CTA SECTION */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white border border-slate-200 rounded-3xl py-16 px-8 md:px-12 shadow-md">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold mb-6 tracking-tight">
                      Pronto para <span className="text-emerald-700">revolucionar</span> os seus eventos?
              </h2>
            <p className="text-lg sm:text-xl mb-10 text-slate-700 max-w-2xl mx-auto leading-relaxed">
                      Junte-se aos organizadores que já estão usando o <strong className="text-violet-700">TYCAT</strong> para criar eventos memoráveis
              </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-emerald-600 text-white px-8 py-4 text-lg shadow-md min-w-[220px] min-h-[48px]">
                          Começar Gratuitamente
                          <Sparkles className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link href="/login">
                <Button variant="outline" size="lg" className="px-8 py-4 text-lg border-slate-300 text-slate-700 min-w-[200px] min-h-[48px]">
                          Já tenho conta
                </Button>
              </Link>
                    </div>
          </div>
        </div>
      </section>

      {/* ✅ FOOTER */}
      <footer className="border-t border-slate-200 py-12 px-4 mt-16 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
              <h2 className="text-slate-900 font-semibold mb-4 text-base">Plataforma</h2>
              <ul className="space-y-2">
                <li className="text-slate-700 cursor-pointer">Organizador</li>
                <li className="text-slate-700 cursor-pointer">Promotor</li>
                <li className="text-slate-700 cursor-pointer">Preços</li>
            </ul>
          </div>
          <div>
              <h3 className="text-slate-900 font-semibold mb-4 text-base">Empresa</h3>
              <ul className="space-y-2">
                <li className="text-slate-700 cursor-pointer">Sobre Nós</li>
                <li className="text-slate-700 cursor-pointer">Blog</li>
                <li className="text-slate-700 cursor-pointer">Contacto</li>
            </ul>
          </div>
          <div>
              <h4 className="text-slate-900 font-semibold mb-4 text-base">Recursos</h4>
              <ul className="space-y-2">
                <li className="text-slate-700 cursor-pointer">Documentação</li>
                <li className="text-slate-700 cursor-pointer">Guias</li>
                <li className="text-slate-700 cursor-pointer">Suporte</li>
            </ul>
          </div>
          <div>
              <h5 className="text-slate-900 font-semibold mb-4 text-base">Legal</h5>
              <ul className="space-y-2">
                <li className="text-slate-700 cursor-pointer">Termos</li>
                <li className="text-slate-700 cursor-pointer">Privacidade</li>
            </ul>
          </div>
        </div>
          
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className="text-emerald-700 font-bold text-lg">TYCAT</span>
              <span className="text-slate-600 text-sm">• Gestão de Eventos Inteligente</span>
            </div>
            <div className="text-center text-slate-600 text-sm">
              © {new Date().getFullYear()} TYCAT. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}