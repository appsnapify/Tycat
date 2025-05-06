'use client'

import { createClient } from '@/lib/supabase-server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { revalidatePath } from 'next/cache'

// Este componente renderiza os formulários de ação do perfil
// que chamam Server Actions para atualizar os dados

export default function UserProfileActions({ 
  userId, 
  userData 
}: { 
  userId: string; 
  userData: any 
}) {
  const [isEditing, setIsEditing] = useState(false)
  
  return (
    <div className="mt-6">
      {isEditing ? (
        <ProfileEditForm 
          initialData={userData} 
          userId={userId} 
          onCancel={() => setIsEditing(false)} 
        />
      ) : (
        <Button 
          onClick={() => setIsEditing(true)}
          variant="outline"
        >
          Editar Perfil
        </Button>
      )}
    </div>
  )
}

function ProfileEditForm({ 
  initialData, 
  userId, 
  onCancel 
}: { 
  initialData: any; 
  userId: string; 
  onCancel: () => void 
}) {
  // Esta é a Server Action que usará o cliente com acesso completo
  async function updateProfile(formData: FormData) {
    'use server'
    
    // Usar o cliente com acesso completo para atualizações
    const supabase = await createClient()
    
    // Coletar dados do formulário
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    
    // Validar dados
    if (!firstName || !lastName) {
      return {
        success: false,
        error: 'Nome e sobrenome são obrigatórios'
      }
    }
    
    try {
      // Atualizar perfil na tabela profiles
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
      
      if (error) {
        return {
          success: false,
          error: error.message
        }
      }
      
      // Revalidar o caminho para atualizar os dados exibidos
      revalidatePath('/profile')
      
      return {
        success: true
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Erro ao atualizar perfil'
      }
    }
  }
  
  return (
    <form action={updateProfile} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium mb-1">
            Nome
          </label>
          <Input 
            id="firstName" 
            name="firstName" 
            defaultValue={initialData?.first_name || ''} 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium mb-1">
            Sobrenome
          </label>
          <Input 
            id="lastName" 
            name="lastName" 
            defaultValue={initialData?.last_name || ''} 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            defaultValue={initialData?.email || ''} 
          />
        </div>
        
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Telefone
          </label>
          <Input 
            id="phone" 
            name="phone" 
            defaultValue={initialData?.phone || ''} 
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit">
          Salvar Alterações
        </Button>
      </div>
    </form>
  )
} 