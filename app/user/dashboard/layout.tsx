import React from 'react'
import { createReadOnlyClient } from '@/lib/supabase-server'
import BottomNav from '@/components/user/BottomNav'
import Header from '@/components/user/Header'
import { redirect } from 'next/navigation'

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Validação de autenticação
  const supabase = await createReadOnlyClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  // Redirecionar para login se não estiver autenticado
  if (!session) {
    // Redirecionar para a página de login de cliente
    redirect('/login/cliente?callbackUrl=/user/dashboard')
  }
  
  // Buscar dados do usuário
  const { data: userData } = await supabase
    .from('client_users')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('auth_id', session.user.id)
    .single()
  
  // Se o usuário não existe na tabela client_users, redirecionar para a página de registro
  if (!userData) {
    redirect('/registro/cliente?callbackUrl=/user/dashboard')
  }
  
  return (
    <div className="flex flex-col min-h-screen pb-16">
      <Header 
        userFirstName={userData?.first_name} 
        avatarUrl={userData?.avatar_url} 
      />
      <main className="flex-grow">
        {children}
      </main>
      <BottomNav />
    </div>
  )
} 