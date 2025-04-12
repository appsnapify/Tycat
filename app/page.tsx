"use client"

import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import Link from 'next/link'
// import Image from 'next/image' // REMOVIDO
import { useAuth } from '@/hooks/use-auth'
import { LogOut } from 'lucide-react'

export default function HomePage() {
  const { user, signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await signOut();
      // Não é necessário redirecionar, pois o hook useAuth já faz isso
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header com botões */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">S</span>
      </div>
              <span className="text-xl font-bold text-gray-900">Snap</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/app/organizador/dashboard">
                  <Button>Dashboard</Button>
              </Link>
                <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sair
                </Button>
              </>
            ) : (
              <>
              <Link href="/login">
                  <Button variant="outline">Iniciar Sessão</Button>
              </Link>
              <Link href="/register">
                  <Button>Criar Conta</Button>
              </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative mt-16 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left space-y-6 max-w-xl mx-auto lg:mx-0"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Gerencie seus eventos com facilidade
            </h1>
              <p className="text-lg sm:text-xl text-gray-600">
                A plataforma completa para gestão de eventos e organizações. Simplifique seus processos e alcance mais pessoas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full">Começar Agora</Button>
              </Link>
                <Link href="/about" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full">Saiba Mais</Button>
              </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="relative h-[300px] sm:h-[400px] lg:h-[500px] mt-8 lg:mt-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center"
            >
              <div className="text-6xl text-indigo-600">📅</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-12">
            Recursos Principais
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 sm:p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
          </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              Pronto para começar?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-8">
              Junte-se a milhares de organizadores que já estão usando o Snap
            </p>
                <Link href="/register">
              <Button size="lg" className="min-w-[200px]">Criar Conta Grátis</Button>
                </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

const features = [
  {
    title: "Gestão de Eventos",
    description: "Crie e gerencie eventos de forma simples e eficiente",
    icon: (
      <svg
        className="w-6 h-6 text-indigo-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "Gestão de Organizações",
    description: "Mantenha todas as suas organizações em um só lugar",
    icon: (
      <svg
        className="w-6 h-6 text-indigo-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
    ),
  },
  {
    title: "Analytics",
    description: "Acompanhe o desempenho dos seus eventos em tempo real",
    icon: (
      <svg
        className="w-6 h-6 text-indigo-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
] 