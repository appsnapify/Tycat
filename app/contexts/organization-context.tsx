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
    // Debounce para evitar loop de re-renders durante Fast Refresh
    const timeoutId = setTimeout(() => {
      loadOrganizations()
    }, 300)
    
    // ✅ FUNÇÃO AUXILIAR: Log throttled para desenvolvimento (Complexidade: 1)
    const logIfDev = (message: string, logKey: string) => {
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !(window as any)[logKey]) {
        console.log(message);
        (window as any)[logKey] = true;
        setTimeout(() => { (window as any)[logKey] = false }, 3000);
      }
    };

    // ✅ FUNÇÃO AUXILIAR: Buscar relações de organizações (Complexidade: 3)
    const fetchUserOrganizations = async (supabase: any, userId: string) => {
      try {                                                        // +1 (try)
        const { data, error } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', userId);
          
        if (error) {                                               // +1 (if)
          console.warn('Aviso ao verificar relações de organizações:', error);
        }
        
        return data ?? [];
      } catch (e) {                                                // +1 (catch)
        console.error('Erro ao acessar relações de organizações:', e);
        return [];
      }
    };

    // ✅ FUNÇÃO AUXILIAR: Processar organizações encontradas (Complexidade: 2)
    const processOrganizationsData = (orgsData: any[]) => {
      if (!orgsData?.length) {                                     // +1 (if + ?.)
        logIfDev('Nenhuma organização encontrada', '__orgNotFoundLogged');
        setOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      setOrganizations(orgsData);
      
      if (!currentOrganization) {                                  // +1 (if)
        logIfDev(`Selecionando a primeira organização: ${orgsData[0].name}`, '__orgSelectLoggedRecently');
        setCurrentOrganization(orgsData[0]);
      } else {
        const orgStillExists = orgsData.some(org => org.id === currentOrganization.id);
        if (!orgStillExists) {                                   // +1 (if)
          logIfDev(`Organização atual não existe mais, selecionando a primeira: ${orgsData[0].name}`, '__orgChangedLogged');
          setCurrentOrganization(orgsData[0]);
        }
      }
    };

    // ✅ FUNÇÃO AUXILIAR: Buscar detalhes das organizações (Complexidade: 3)
    const fetchOrganizationDetails = async (supabase: any, orgIds: string[]) => {
      try {                                                        // +1 (try)
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('id, name, slug, logo_url, banner_url, address')
          .in('id', orgIds);
        
        if (orgsError) {                                           // +1 (if)
          console.warn('Aviso ao buscar detalhes das organizações:', orgsError);
        }
        
        processOrganizationsData(orgsData ?? []);
      } catch (e) {                                                // +1 (catch)
        console.error('Erro ao processar detalhes das organizações:', e);
        setOrganizations([]);
        setCurrentOrganization(null);
      }
    };

    // ✅ FUNÇÃO PRINCIPAL REFATORADA (Complexidade: 7)
    async function loadOrganizations() {
      if (!user) {                                                 // +1 (if)
        logIfDev('OrganizationContext: Nenhum usuário logado', '__orgNoUserLoggedRecently');
        setIsLoading(false);
        return;
      }

      try {                                                        // +1 (try)
        const supabase = createClient();
        logIfDev(`OrganizationContext: Buscando organizações para o usuário: ${user.id}`, '__orgSearchLoggedRecently');
        
        const userOrgsCheck = await fetchUserOrganizations(supabase, user.id);
        
        if (!userOrgsCheck?.length) {                              // +1 (if + ?.)
          logIfDev('Usuário não tem organizações associadas', '__orgNoOrgsLogged');
          setOrganizations([]);
          setCurrentOrganization(null);
          setIsLoading(false);
          return;
        }
        
        const orgIds = userOrgsCheck.map(rel => rel.organization_id);
        await fetchOrganizationDetails(supabase, orgIds);
        
      } catch (error) {                                            // +1 (catch)
        console.error('OrganizationContext: Erro ao carregar organizações:', error);
        setOrganizations([]);
        setCurrentOrganization(null);
      } finally {                                                  // +1 (finally)
        setIsLoading(false);
      }
    }
    
    // Cleanup timeout on unmount or dependency change
    return () => clearTimeout(timeoutId)
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