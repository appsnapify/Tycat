import React, { useEffect, useState } from 'react'
import { auth } from '../lib/auth'
import { supabase } from '../lib/supabase'

const OrganizationContext = React.createContext()

const OrganizationProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [hasOrganizations, setHasOrganizations] = useState(false)
  const [userOrganizations, setUserOrganizations] = useState([])
  const [activeOrganization, setActiveOrganization] = useState(null)

  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        // Verificar se há um usuário logado
        const session = await auth.getSession()
        const currentUser = session?.user
        
        if (!currentUser) {
          console.log('OrganizationContext: Nenhum usuário logado')
          setIsLoading(false)
          return
        }
        
        // Se tiver um usuário, buscar suas organizações
        try {
          console.log('OrganizationContext: Buscando organizações para o usuário:', currentUser.id)
          
          // Buscar relações de organizações do usuário
          const { data: orgRelations, error: orgRelationsError } = await supabase
            .from('user_organizations')
            .select('organization_id')
            .eq('user_id', currentUser.id)
          
          if (orgRelationsError) {
            // Tratar o erro mas não interromper o fluxo
            console.error('Erro ao buscar relações de organizações:', orgRelationsError)
            setHasOrganizations(false)
            setIsLoading(false)
            return
          }
          
          console.log('Relações de organizações encontradas:', orgRelations?.length || 0)
          
          // Se não tiver organizações, definir o estado e retornar
          if (!orgRelations || orgRelations.length === 0) {
            console.log('Usuário não tem organizações associadas')
            setHasOrganizations(false)
            setUserOrganizations([])
            setIsLoading(false)
            return
          }
          
          setHasOrganizations(true)
          
          // Buscar detalhes das organizações
          const organizationIds = orgRelations.map(relation => relation.organization_id)
          
          const { data: orgs, error: orgsError } = await supabase
            .from('organizations')
            .select('*')
            .in('id', organizationIds)
          
          if (orgsError) {
            console.error('Erro ao buscar detalhes das organizações:', orgsError)
            // Mesmo com erro, sabemos que existem organizações
            setIsLoading(false)
            return
          }
          
          // Definir as organizações encontradas
          setUserOrganizations(orgs || [])
          
          // Se tiver organizações, selecionar a primeira como ativa
          if (orgs && orgs.length > 0) {
            // Se já tiver uma organização no localStorage, usar ela
            const storedOrgId = localStorage.getItem('activeOrganizationId')
            
            if (storedOrgId && orgs.some(org => org.id === storedOrgId)) {
              setActiveOrganization(orgs.find(org => org.id === storedOrgId) || orgs[0])
            } else {
              // Caso contrário, usar a primeira
              setActiveOrganization(orgs[0])
              localStorage.setItem('activeOrganizationId', orgs[0].id)
            }
          }
        } catch (error) {
          console.error('Erro ao buscar organizações:', error)
        } finally {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error)
        setIsLoading(false)
      }
    }

    fetchOrganizations()
  }, [])

  return (
    <OrganizationContext.Provider value={{ isLoading, hasOrganizations, userOrganizations, activeOrganization }}>
      {children}
    </OrganizationContext.Provider>
  )
}

export default OrganizationProvider 