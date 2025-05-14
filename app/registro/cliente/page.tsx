import React from 'react'
import Link from 'next/link'
import ClientRegistrationForm from '@/components/cliente/ClientRegistrationForm'
import { createReadOnlyClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function ClientRegistrationPage() {
  // Verificar se já está autenticado
  const supabase = await createReadOnlyClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // Se já estiver logado, redirecionar para o dashboard
  if (session) {
    redirect('/user/dashboard')
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Cabeçalho */}
      <header className="p-4 text-center">
        <h1 className="text-2xl font-bold text-blue-600">Snapify</h1>
        <p className="text-gray-600 mt-1">Área do Cliente</p>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Criar Conta de Cliente</h2>
            
            <ClientRegistrationForm />
            
            <div className="mt-8 text-center text-sm">
              <p className="text-gray-600">
                Já tem uma conta?{' '}
                <Link href="/login/cliente" className="text-blue-600 font-medium hover:underline">
                  Entrar
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="p-4 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} Snapify. Todos os direitos reservados.
      </footer>
    </div>
  )
} 