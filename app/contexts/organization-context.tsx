"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
// import { useAuth } from '@/hooks/use-auth' // Linha ANTIGA comentada
import { useAuth } from '@/app/app/_providers/auth-provider' // Linha NOVA - Apontar para o useAuth unificado
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'

interface Organization {
  id: string
  name: string
  slug: string
  logo_url?: string
  banner_url?: string
  address?: string
}

interface OrganizationContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  setCurrentOrganization: (org: Organization | null) => void
  isLoading: boolean
  hasOrganizations: boolean
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadOrganizations() {
      if (!user) {
        if (process.env.NODE_ENV === 'development') {
          console.log('OrganizationContext: Nenhum usuário logado')
        }
        setIsLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        if (process.env.NODE_ENV === 'development') {
          console.log('OrganizationContext: Buscando organizações para o usuário:', user.id)
        }
        
        // Verificar primeiro a tabela user_organizations para confirmar relações
        let userOrgsCheck;
        try {
          const { data, error } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', user.id)
            
          if (error) {
            console.warn('Aviso ao verificar relações de organizações:', error)
            // Continuar mesmo com erro
          }
          
          userOrgsCheck = data || [];
        } catch (e) {
          console.error('Erro ao acessar relações de organizações:', e)
          userOrgsCheck = [];
        }
        
        if (process.env.NODE_ENV === 'development') {
          // console.log('Relações de organizações encontradas:', userOrgsCheck?.length || 0)
        }
        
        if (!userOrgsCheck || userOrgsCheck.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Usuário não tem organizações associadas')
          }
          setOrganizations([])
          setCurrentOrganization(null)
          setIsLoading(false)
          return
        }
        
        // Extrair IDs das organizações
        const orgIds = userOrgsCheck.map(rel => rel.organization_id)
        if (process.env.NODE_ENV === 'development') {
          // console.log('IDs das organizações:', orgIds)
        }
        
        // Buscar detalhes das organizações diretamente
        try {
          const { data: orgsData, error: orgsError } = await supabase
            .from('organizations')
            .select('id, name, slug, logo_url, banner_url, address')
            .in('id', orgIds)
          
          if (orgsError) {
            console.warn('Aviso ao buscar detalhes das organizações:', orgsError)
            // Continuar mesmo com erro
          }
          
          if (process.env.NODE_ENV === 'development') {
            // console.log('Detalhes das organizações:', orgsData?.length || 0, orgsData)
          }
          
          if (orgsData && orgsData.length > 0) {
            setOrganizations(orgsData)
            
            // Se não há organização selecionada, selecione a primeira
            if (!currentOrganization) {
              if (process.env.NODE_ENV === 'development') {
                console.log('Selecionando a primeira organização:', orgsData[0].name, orgsData[0].id)
              }
              setCurrentOrganization(orgsData[0])
            } else {
              // Verificar se a organização atual ainda está na lista
              const orgStillExists = orgsData.some(org => org.id === currentOrganization.id)
              if (!orgStillExists) {
                if (process.env.NODE_ENV === 'development') {
                  console.log('Organização atual não existe mais, selecionando a primeira:', orgsData[0].name)
                }
                setCurrentOrganization(orgsData[0])
              }
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('Nenhuma organização encontrada')
            }
            setOrganizations([])
            setCurrentOrganization(null)
          }
        } catch (e) {
          console.error('Erro ao processar detalhes das organizações:', e)
          setOrganizations([])
          setCurrentOrganization(null)
        }
      } catch (error) {
        console.error('OrganizationContext: Erro ao carregar organizações:', error)
        setOrganizations([])
        setCurrentOrganization(null)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadOrganizations()
  }, [user?.id])

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        setCurrentOrganization,
        isLoading,
        hasOrganizations: organizations.length > 0
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