'use client'

// ⚠️ DEPRECATED: Este contexto está obsoleto.
// Por favor, use @/app/contexts/organization-context.tsx no lugar deste.
// Este arquivo será removido em uma versão futura.

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/app/app/_providers/auth-provider'

interface Organization {
  id: string
  name: string
  logotipo?: string
  banner_url?: string
}

interface OrganizationContextType {
  organizations: Organization[]
  selectedOrganization: Organization | null
  setSelectedOrganization: (org: Organization | null) => void
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)

  const refreshOrganizations = async () => {
    if (!user) return

    try {
      // Primeiro, buscar as organizações do usuário através da tabela de relacionamento
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)

      if (userOrgsError) {
        console.error('Erro ao buscar relações:', userOrgsError)
        throw userOrgsError
      }

      if (!userOrgs || userOrgs.length === 0) {
        setOrganizations([])
        setSelectedOrganization(null)
        return
      }

      // Depois, buscar os detalhes das organizações
      const orgIds = userOrgs.map(uo => uo.organization_id)
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select('id, name, logotipo, banner_url')
        .in('id', orgIds)

      if (orgsError) {
        console.error('Erro ao buscar organizações:', orgsError)
        throw orgsError
      }

      setOrganizations(orgs || [])
      
      // Se não houver organização selecionada e existirem organizações,
      // seleciona a primeira automaticamente
      if (orgs && orgs.length > 0 && !selectedOrganization) {
        setSelectedOrganization(orgs[0])
      }
    } catch (error) {
      console.error('Erro ao carregar organizações:', error)
      setOrganizations([])
      setSelectedOrganization(null)
    }
  }

  useEffect(() => {
    refreshOrganizations()
  }, [user])

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        selectedOrganization,
        setSelectedOrganization,
        refreshOrganizations
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
} 