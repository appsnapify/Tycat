import React from 'react'
import { createReadOnlyClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { UserCircle, Mail, Phone, LogOut, Edit } from 'lucide-react'
import { logoutClient } from '@/app/cliente/actions'

export default async function UserProfilePage() {
  const supabase = await createReadOnlyClient()
  
  // Obter a sessão atual
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login/cliente?callbackUrl=/user/dashboard/profile')
  }
  
  // Buscar dados completos do usuário
  const { data: userData } = await supabase
    .from('client_users')
    .select('id, first_name, last_name, email, phone, avatar_url')
    .eq('auth_id', session.user.id)
    .single()
  
  if (!userData) {
    redirect('/registro/cliente?callbackUrl=/user/dashboard/profile')
  }
  
  const fullName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim()
  
  return (
    <div className="user-profile-page pb-8">
      <div className="p-4 pt-0">
        <h1 className="text-2xl font-bold mb-2">Perfil</h1>
        <p className="text-gray-600">Gerencie suas informações pessoais</p>
      </div>
      
      <div className="mt-4 px-4">
        <div className="profile-card bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Cabeçalho do perfil */}
          <div className="bg-blue-500 p-6 text-white text-center">
            <div className="avatar-container mx-auto w-24 h-24 rounded-full overflow-hidden bg-white border-4 border-white">
              {userData.avatar_url ? (
                <Image 
                  src={userData.avatar_url} 
                  alt="Avatar do usuário" 
                  width={96} 
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                  <UserCircle size={50} />
                </div>
              )}
            </div>
            
            <h2 className="mt-4 text-xl font-bold">
              {fullName || 'Usuário'}
            </h2>
          </div>
          
          {/* Detalhes do perfil */}
          <div className="p-6">
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center">
                <Mail size={20} className="text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{userData.email || 'Não informado'}</div>
                </div>
              </div>
              
              {/* Telefone */}
              <div className="flex items-center">
                <Phone size={20} className="text-gray-400 mr-3" />
                <div>
                  <div className="text-sm text-gray-500">Telefone</div>
                  <div className="font-medium">{userData.phone || 'Não informado'}</div>
                </div>
              </div>
            </div>
            
            {/* Ações do perfil */}
            <div className="mt-8 space-y-3">
              <Link 
                href="/user/dashboard/profile/edit" 
                className="w-full flex items-center justify-center gap-2 bg-blue-500 text-white py-3 rounded-lg font-medium"
              >
                <Edit size={18} />
                Editar perfil
              </Link>
              
              <form action={logoutClient}>
                <button 
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 