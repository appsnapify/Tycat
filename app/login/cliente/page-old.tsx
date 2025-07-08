import React from 'react'
import Link from 'next/link'
import ClientLoginFormReal from '@/components/cliente/ClientLoginFormReal'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from '@/lib/database.types'

// BACKUP DO SISTEMA ORIGINAL - NÃO DELETAR
// Este arquivo contém o sistema de login original para referência/rollback

// Cores modernizadas - mesmas do login principal
const colors = {
  background: 'bg-gradient-to-br from-gray-100 via-gray-50 to-white',
  textPrimary: 'text-gray-800',
  textSecondary: 'text-gray-500',
  accentLime: 'text-lime-600',
  accentMagenta: 'text-fuchsia-600',
  bgAccentLime: 'bg-lime-500',
  bgAccentMagenta: 'bg-fuchsia-500',
  borderLime: 'border-lime-400',
  borderFuchsia: 'border-fuchsia-200',
}

export default async function ClientLoginPageOld() {
  // Verificar se já está autenticado - usando mesmo padrão do promotor page
  const cookieStore = await cookies();
  const supabase = createServerComponentClient<Database>({ 
    cookies: () => cookieStore 
  });
  
  const { data: { session } } = await supabase.auth.getSession()
  
  // Se já estiver logado, redirecionar para o dashboard
  if (session) {
    redirect('/user/dashboard')
  }
  
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${colors.background} py-12 px-4 sm:px-6 lg:px-8 relative`}>
      {/* Elementos decorativos no fundo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-fuchsia-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-lime-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
      </div>

      {/* Elemento decorativo superior */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center mb-8">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-lime-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="ml-3 text-2xl font-bold text-gray-800">SNAP</div>
      </div>

      <div className="w-full max-w-md z-10 mt-24">
        <div className="border border-gray-100 rounded-xl shadow-lg p-8 bg-white/80 backdrop-blur-lg relative overflow-hidden">
          {/* Borda decorativa lateral */}
          <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-lime-500 to-fuchsia-500"></div>
          
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold ${colors.textPrimary}`}>Área do Cliente</h2>
              <p className={`mt-2 text-sm ${colors.textSecondary}`}>
                Não tem uma conta?{' '}
                <Link href="/registro/cliente" className={`${colors.accentLime} font-medium`}>
                  Cadastre-se
                </Link>
              </p>
            </div>
            <Link href="/login">
              <Button variant="ghost" className={colors.textSecondary}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            </Link>
          </div>

          <div className="mt-6">
            <ClientLoginFormReal />
          </div>

          <div className="mt-6 text-center">
            <p className={`text-sm ${colors.textSecondary}`}>
              Sou organizador ou promotor{" "}
              <Link href="/login" className={`font-medium ${colors.accentMagenta}`}>
                Acessar
              </Link>
            </p>
          </div>
        </div>

        {/* Sombra adicional para profundidade */}
        <div className="h-2 mx-8 bg-gradient-to-r from-transparent via-gray-200 to-transparent rounded-full opacity-50 mt-1"></div>
      </div>
    </div>
  )
} 