'use client'

import { useState } from 'react'
import { useUser } from '@/hooks/useUser'
import { ArrowLeft, User, Phone, Mail, Shield, LogOut, Edit3, Save, X } from 'lucide-react'
import Header from '@/components/user/Header'
import BottomNav from '@/components/user/BottomNav'
import ProtectedRoute from '@/components/user/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'

export default function ProfilePage() {
  const { user, logout } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [editingData, setEditingData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleEdit = () => {
    setEditingData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || ''
    })
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || ''
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      // Aqui faria a atualização do perfil via API
      // Por agora, apenas simula o save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "Perfil atualizado",
        description: "As suas informações foram atualizadas com sucesso.",
        duration: 3000,
      })
      
      setIsEditing(false)
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil. Tente novamente.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      router.push('/user/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      setIsLoggingOut(false)
    }
  }

  const firstName = user?.firstName || 'Cliente'
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white pb-20">
        <Header />
        
        <main className="p-4 space-y-6">
          {/* Header com botão voltar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/user/dashboard')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Perfil</h1>
              <p className="text-gray-400 text-sm">Gerir as suas informações pessoais</p>
            </div>
          </div>

          {/* Avatar e Info Principal */}
          <div className="bg-gray-800 rounded-xl p-6 text-center">
            <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-black font-bold text-2xl">{initial}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-gray-400 text-sm">
              Cliente desde {user?.createdAt ? new Date(user.createdAt).getFullYear() : 'N/A'}
            </p>
          </div>

          {/* Informações Pessoais */}
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-yellow-400" />
                Informações Pessoais
              </h3>
              {!isEditing ? (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-md font-medium transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md font-medium transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'A guardar...' : 'Guardar'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Nome */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Primeiro Nome
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingData.firstName}
                      onChange={(e) => setEditingData({...editingData, firstName: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                      {user?.firstName || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Último Nome
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingData.lastName}
                      onChange={(e) => setEditingData({...editingData, lastName: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                    />
                  ) : (
                    <p className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                      {user?.lastName || '-'}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editingData.email}
                    onChange={(e) => setEditingData({...editingData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:border-yellow-400"
                  />
                ) : (
                  <p className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                    {user?.email || '-'}
                  </p>
                )}
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Telefone
                </label>
                <p className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white">
                  {user?.phone || '-'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Para alterar o telefone, contacte o suporte
                </p>
              </div>
            </div>
          </div>

          {/* Segurança */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-yellow-400" />
              Segurança
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <div>
                  <p className="text-white font-medium">Password</p>
                  <p className="text-gray-400 text-sm">••••••••</p>
                </div>
                <button className="text-yellow-400 hover:text-yellow-300 font-medium text-sm">
                  Alterar
                </button>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-white font-medium">Autenticação de 2 fatores</p>
                  <p className="text-gray-400 text-sm">Proteja a sua conta com 2FA</p>
                </div>
                <button className="text-yellow-400 hover:text-yellow-300 font-medium text-sm">
                  Configurar
                </button>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50"
            >
              <LogOut className="w-5 h-5" />
              {isLoggingOut ? 'A sair...' : 'Terminar Sessão'}
            </button>
          </div>
        </main>

        <BottomNav />
      </div>
    </ProtectedRoute>
  )
} 