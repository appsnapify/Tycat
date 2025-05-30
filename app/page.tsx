"use client"

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Ticket, BarChart2, Users, CheckCircle, LayoutDashboard, ClipboardList, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// Cores modernizadas - alinhadas com o novo tema claro
const colors = {
  background: 'bg-gradient-to-br from-gray-100 via-gray-50 to-white',
  textPrimary: 'text-gray-800',
  textSecondary: 'text-gray-500',
  accentLime: 'text-lime-600',
  accentMagenta: 'text-fuchsia-600',
  bgAccentLime: 'bg-lime-500',
  bgAccentMagenta: 'bg-fuchsia-500',
  borderLime: 'border-lime-400',
  borderFuchsia: 'border-fuchsia-400',
  borderLight: 'border-gray-200',
  cardBg: 'bg-white/80',
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
      // Redirecionar para página inicial
      window.location.href = '/'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  // Mostrar loading básico enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    )
  }

  return (
    <div className={`${colors.background} ${colors.textPrimary} min-h-screen overflow-x-hidden relative`}>
      {/* Elementos decorativos no fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-20 right-20 w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-[70%] left-[20%] w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-[40%] right-[15%] w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      </div>

      {/* Navbar com autenticação */}
      <nav className={`flex justify-between items-center py-2 px-3 ${colors.borderLight} border-b sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm`}>
        <Link href="/" className={`${colors.accentLime} font-bold text-base md:text-lg`}>SNAPIFY</Link>
        <div className="flex items-center">
          {user ? (
            <>
              <Link href="/app/organizador/dashboard">
                <Button variant="ghost" className={`mr-1 text-xs md:text-sm ${colors.textSecondary} hover:${colors.textPrimary} flex items-center h-8`}>
                  <LayoutDashboard className="h-3 w-3 mr-1" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                onClick={handleLogout} 
                className={`${colors.textSecondary} hover:${colors.textPrimary} flex items-center gap-1 text-xs md:text-sm h-8`}
              >
                <LogOut className="h-3 w-3" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" className={`mr-1 text-xs md:text-sm ${colors.textSecondary} hover:${colors.textPrimary} h-8`}>Login</Button>
              </Link>
              <Link href="/register">
                <Button className={`${colors.bgAccentLime} text-white hover:${colors.bgAccentLime}/90 text-xs md:text-sm px-2 md:px-3 h-8`}>Criar Conta</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center pt-24 pb-16 md:pt-32 md:pb-24 px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight">
            Gestão Completa de <span className={colors.accentLime}>Eventos</span>, Equipas e <span className={colors.accentMagenta}>Bilhetes.</span>
          </h1>
          <p className={`${colors.textSecondary} mb-8 text-base md:text-lg max-w-xl md:max-w-3xl mx-auto`}>
            Potencialize seus eventos com ferramentas intuitivas para <span className={colors.accentLime}>guest lists</span>, venda de <span className={colors.accentMagenta}>bilhetes</span> online, gestão de <span className={colors.accentLime}>promotores e equipas</span>, e relatórios detalhados.
          </p>
          <Link href="/register">
            <Button size="lg" className={`${colors.bgAccentLime} text-white hover:${colors.bgAccentLime}/90 px-6 md:px-8 py-2.5 md:py-3 text-base md:text-lg shadow-md`}>
              Começar Gratuitamente
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Plataforma <span className={colors.accentLime}>Tudo-em-Um</span> para Organizadores</h2>
          <p className={`${colors.textSecondary} text-base md:text-lg`}>Simplifique cada etapa do seu evento.</p>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-6 ${colors.cardBg} rounded-xl border ${colors.borderLight} shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden backdrop-blur-sm`}
            >
              {/* Borda decorativa lateral */}
              <div className={`absolute left-0 top-0 h-full w-1 ${index % 2 === 0 ? 'bg-gradient-to-b from-lime-400 to-lime-500' : 'bg-gradient-to-b from-fuchsia-400 to-fuchsia-500'}`}></div>
              
              <div className="flex justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">
                {feature.title}
              </h3>
              <p className={colors.textSecondary}>{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          <div className="bg-gradient-to-r from-lime-500 to-fuchsia-500 p-1 rounded-2xl">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl py-12 px-8">
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Pronto para começar?
              </h2>
              <p className={`text-lg sm:text-xl mb-8 ${colors.textSecondary}`}>
                Junte-se a milhares de organizadores que já estão usando o Snapify
              </p>
              <Link href="/register">
                <Button size="lg" className={`min-w-[200px] ${colors.bgAccentMagenta} text-white hover:bg-fuchsia-600 shadow-md`}>
                  Criar Conta Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${colors.borderLight} border-t py-10 px-4 mt-10 relative z-10 bg-white/50 backdrop-blur-sm`}>
        <div className={`max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm ${colors.textSecondary}`}>
          {/* Colunas do Footer */}
          <div>
            <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Plataforma</h4>
            <ul>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Organizador</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Promotor</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Preços</li>
            </ul>
          </div>
          <div>
            <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Empresa</h4>
            <ul>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Sobre Nós</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Blog</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Contacto</li>
            </ul>
          </div>
          <div>
            <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Recursos</h4>
            <ul>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Documentação</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Guias</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Suporte</li>
            </ul>
          </div>
          <div>
            <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Legal</h4>
            <ul>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Termos</li>
              <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Privacidade</li>
            </ul>
          </div>
        </div>
        <div className={`text-center ${colors.textSecondary} mt-12 text-xs`}>
          © {new Date().getFullYear()} SNAPIFY. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

// Atualizando os ícones para usar o novo tema
const features = [
  {
    title: "Gestão de Eventos",
    description: "Crie e gerencie eventos de forma simples e eficiente",
    icon: <Ticket className="h-10 w-10 text-lime-500" />,
  },
  {
    title: "Gestão de Organizações",
    description: "Mantenha todas as suas organizações em um só lugar",
    icon: <Users className="h-10 w-10 text-fuchsia-500" />,
  },
  {
    title: "Analytics",
    description: "Acompanhe o desempenho dos seus eventos em tempo real",
    icon: <BarChart2 className="h-10 w-10 text-lime-500" />,
  },
] 