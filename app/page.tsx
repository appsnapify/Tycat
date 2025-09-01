"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Ticket, BarChart2, Users, LayoutDashboard, LogOut, Sparkles, Zap, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// ✅ LAZY LOAD Framer Motion para reduzir TBT - Corrigido para Next.js 15.5.2
import { motion, AnimatePresence } from 'framer-motion'

// Paleta de cores elegante para TYCAT - Código limpo
const colors = {
  background: 'bg-gradient-to-br from-slate-50 via-white to-emerald-50/30',
  textPrimary: 'text-slate-800',
  textSecondary: 'text-slate-600',
  textMuted: 'text-slate-500',
  accentEmerald: 'text-emerald-600',
  accentViolet: 'text-violet-600',
  accentAmber: 'text-amber-600',
  bgAccentEmerald: 'bg-emerald-500',
  borderLight: 'border-slate-200',
}

// Componente TextRotate integrado
const TextRotate = ({ texts, className = "" }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [texts.length])

  return (
    <span className={`inline-block ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="inline-block"
        >
          {texts[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export default function HomePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    // Verificar sessão atual
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      // Redirecionar para página inicial de forma segura
      window.location.assign('/')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Loading state elegante
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="text-slate-600 font-medium">Carregando TYCAT...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${colors.background} ${colors.textPrimary} min-h-screen overflow-x-hidden relative`}>
      {/* Elementos decorativos responsivos */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-10 -left-10 w-48 h-48 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute top-10 right-10 w-48 h-48 sm:w-80 sm:h-80 lg:w-96 lg:h-96 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-15"></div>
        <div className="absolute top-[60%] left-[5%] w-32 h-32 sm:w-60 sm:h-60 lg:w-80 lg:h-80 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
        <div className="absolute top-[40%] right-[10%] w-40 h-40 sm:w-56 sm:h-56 lg:w-72 lg:h-72 bg-emerald-100 rounded-full mix-blend-multiply filter blur-2xl opacity-20"></div>
      </div>

      {/* Navbar elegante */}
      <nav className={`flex justify-between items-center py-3 px-4 ${colors.borderLight} border-b sticky top-0 z-50 bg-white/95 backdrop-blur-lg shadow-sm`}>
        <div className="flex items-center space-x-2">
          <Link href="/" className={`${colors.accentEmerald} font-bold text-lg md:text-xl tracking-tight`}>TYCAT</Link>
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hidden sm:inline-flex">
            Beta
          </Badge>
        </div>
        <div className="flex items-center space-x-2">
          {user ? (
            <>
              <Link href="/app/organizador/dashboard">
                <Button variant="ghost" className={`text-sm ${colors.textSecondary} hover:${colors.textPrimary} flex items-center h-9`}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className={`${colors.textSecondary} hover:${colors.textPrimary} flex items-center gap-2 text-sm h-9`}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className={`text-sm ${colors.textSecondary} hover:${colors.textPrimary} h-9`}>
                  Entrar
                </Button>
              </Link>
              <Link href="/register">
                <Button className={`${colors.bgAccentEmerald} text-white hover:bg-emerald-600 text-sm px-4 h-9 shadow-sm`}>
                  Começar Grátis
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section Moderno */}
      <section className="text-center pt-12 pb-16 md:pt-16 md:pb-20 px-4 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Título com TextRotate otimizado */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight tracking-tight">
              <span className="block">Gestão Completa de</span>
              <TextRotate 
                texts={["Eventos", "Equipas", "Bilhetes", "Promotores"]}
                className={`${colors.accentEmerald} block`}
              />
              <span className="block mt-2">
                Simples e <span className={colors.accentViolet}>Poderosa</span>
              </span>
            </h1>

            {/* Descrição melhorada */}
            <motion.p 
              className={`${colors.textSecondary} mb-10 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              Transforme a gestão dos seus eventos com ferramentas intuitivas para{" "}
              <span className={`${colors.accentEmerald} font-medium`}>guest lists</span>,{" "}
              <span className={`${colors.accentViolet} font-medium`}>venda de bilhetes</span> e{" "}
              <span className={`${colors.accentAmber} font-medium`}>relatórios detalhados</span>.
            </motion.p>

            {/* CTAs modernos */}
        <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
          <Link href="/register">
                <Button size="lg" className={`${colors.bgAccentEmerald} text-white hover:bg-emerald-600 px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all duration-300`}>
              Começar Gratuitamente
                  <Zap className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className={`px-8 py-3 text-lg border-slate-200 hover:bg-slate-50 ${colors.textSecondary}`}>
                  Ver Funcionalidades
            </Button>
          </Link>
        </motion.div>
          </motion.div>

          {/* Mockup placeholder - será adicionado posteriormente */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-16 relative"
          >
            <div className="relative mx-auto max-w-4xl">
              <div className="bg-gradient-to-r from-emerald-500/10 to-violet-500/10 rounded-2xl p-8 backdrop-blur-sm border border-white/20">
                <div className="bg-white rounded-xl shadow-2xl p-6 aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-violet-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <Ticket className="w-8 h-8 text-white" />
                    </div>
                    <p className={`${colors.textMuted} text-lg`}>Dashboard Preview</p>
                    <p className={`${colors.textSecondary} text-sm mt-1`}>Em breve...</p>
                  </div>
                </div>
              </div>
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-violet-500/20 rounded-3xl blur-2xl -z-10"></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section Moderna */}
      <section id="features" className="py-20 md:py-28 px-4 relative z-10 bg-gradient-to-b from-transparent to-slate-50/50">
        <div className="max-w-6xl mx-auto">
          {/* Header da seção */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="mb-4 bg-violet-50 text-violet-700 border-violet-200">
                <Shield className="w-4 h-4 mr-2" />
                Funcionalidades Principais
              </Badge>
              <h2 className="text-4xl md:text-5xl xl:text-6xl font-bold mb-4 tracking-tight">
                Plataforma <span className={colors.accentEmerald}>Completa</span> para{" "}
                <span className={colors.accentViolet}>Organizadores</span>
              </h2>
              <p className={`${colors.textSecondary} text-lg md:text-xl max-w-2xl mx-auto`}>
                Todas as ferramentas que precisa numa única plataforma elegante e intuitiva.
              </p>
            </motion.div>
          </div>

          {/* Grid de features com decoradores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuresData.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative"
              >
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 relative overflow-hidden">
                  {/* Decorador visual */}
                  <div className="relative mx-auto w-20 h-20 mb-6 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px] opacity-30" />
                    <div className={`absolute inset-0 m-auto flex w-12 h-12 items-center justify-center rounded-xl border-t border-l ${feature.bgColor} ${feature.borderColor}`}>
                {feature.icon}
              </div>
                  </div>

                  {/* Conteúdo */}
                  <h3 className="text-xl font-semibold mb-3 text-center">
                {feature.title}
              </h3>
                  <p className={`${colors.textSecondary} text-center leading-relaxed`}>
                    {feature.description}
                  </p>

                  {/* Gradient overlay sutil */}
                  <div className={`absolute inset-0 ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl`} />
                </div>
            </motion.div>
          ))}
          </div>
        </div>
      </section>

      {/* CTA Section Elegante */}
      <section className="py-20 md:py-28 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="bg-gradient-to-r from-emerald-500 to-violet-500 p-1 rounded-3xl shadow-2xl">
              <div className="bg-white/98 backdrop-blur-md rounded-3xl py-16 px-8 md:px-12 relative overflow-hidden">
                {/* Elementos decorativos */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden" aria-hidden="true">
                  <div className="absolute top-4 left-4 w-20 h-20 bg-emerald-100 rounded-full opacity-20"></div>
                  <div className="absolute bottom-4 right-4 w-16 h-16 bg-violet-100 rounded-full opacity-20"></div>
                </div>
                
                <div className="relative z-10">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                  >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-bold mb-6 tracking-tight">
                      Pronto para <span className={colors.accentEmerald}>revolucionar</span> os seus eventos?
              </h2>
                    <p className={`text-lg sm:text-xl mb-10 ${colors.textSecondary} max-w-2xl mx-auto leading-relaxed`}>
                      Junte-se aos organizadores que já estão usando o <strong className={colors.accentViolet}>TYCAT</strong> para criar eventos memoráveis
              </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                        <Button size="lg" className={`${colors.bgAccentEmerald} text-white hover:bg-emerald-600 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 min-w-[200px]`}>
                          Começar Gratuitamente
                          <Sparkles className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                      <Link href="/login">
                        <Button variant="outline" size="lg" className={`px-8 py-4 text-lg border-slate-300 hover:bg-slate-50 ${colors.textSecondary} min-w-[200px]`}>
                          Já tenho conta
                </Button>
              </Link>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
            {/* Glow effect */}
            <div className="absolute -inset-6 bg-gradient-to-r from-emerald-500/20 to-violet-500/20 rounded-3xl blur-2xl -z-10"></div>
          </div>
        </div>
      </section>

      {/* Footer Elegante */}
      <footer className="border-t border-slate-200 py-12 px-4 mt-16 relative z-10 bg-slate-50/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div>
              <h4 className={`${colors.textPrimary} font-semibold mb-4 text-base`}>Plataforma</h4>
              <ul className="space-y-2">
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Organizador</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Promotor</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Preços</li>
            </ul>
          </div>
          <div>
              <h4 className={`${colors.textPrimary} font-semibold mb-4 text-base`}>Empresa</h4>
              <ul className="space-y-2">
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Sobre Nós</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Blog</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Contacto</li>
            </ul>
          </div>
          <div>
              <h4 className={`${colors.textPrimary} font-semibold mb-4 text-base`}>Recursos</h4>
              <ul className="space-y-2">
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Documentação</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Guias</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Suporte</li>
            </ul>
          </div>
          <div>
              <h4 className={`${colors.textPrimary} font-semibold mb-4 text-base`}>Legal</h4>
              <ul className="space-y-2">
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Termos</li>
                <li className={`${colors.textSecondary} hover:${colors.accentEmerald} cursor-pointer transition-colors`}>Privacidade</li>
            </ul>
          </div>
        </div>
          
          <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <span className={`${colors.accentEmerald} font-bold text-lg`}>TYCAT</span>
              <span className={`${colors.textMuted} text-sm`}>• Gestão de Eventos Inteligente</span>
            </div>
            <div className={`text-center ${colors.textMuted} text-sm`}>
              © {new Date().getFullYear()} TYCAT. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Dados das features com design moderno
const featuresData = [
  {
    title: "Gestão de Eventos",
    description: "Crie e gerencie eventos de forma simples e eficiente com ferramentas intuitivas e poderosas.",
    icon: <Ticket className="h-6 w-6 text-emerald-600" />,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    gradient: "bg-gradient-to-br from-emerald-500 to-emerald-600"
  },
  {
    title: "Gestão de Equipas",
    description: "Coordene equipas e promotores numa única plataforma, mantendo todos alinhados e produtivos.",
    icon: <Users className="h-6 w-6 text-violet-600" />,
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    gradient: "bg-gradient-to-br from-violet-500 to-violet-600"
  },
  {
    title: "Analytics Inteligentes",
    description: "Acompanhe métricas em tempo real e tome decisões baseadas em dados concretos.",
    icon: <BarChart2 className="h-6 w-6 text-amber-600" />,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    gradient: "bg-gradient-to-br from-amber-500 to-amber-600"
  },
] 