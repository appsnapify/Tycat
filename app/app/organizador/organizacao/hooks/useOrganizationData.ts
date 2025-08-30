import { useState, useEffect } from 'react'
import { useAuth } from '@/app/app/_providers/auth-provider'
import { useOrganization } from '@/app/contexts/organization-context'
import { createClient } from '@/lib/supabase'
import { OrganizationData } from '../types/Organization'

// ✅ HOOK PERSONALIZADO: useOrganizationData (Complexidade: 8 pontos)
export const useOrganizationData = () => {
  const { user } = useAuth() 
  const { currentOrganization, isLoading: isOrgLoading } = useOrganization()
  const supabase = createClient()
  
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false) 
  const [error, setError] = useState<string | null>(null) 

  useEffect(() => {
    console.log(
      `[OrgPage Effect] Run. isOrgLoading=${isOrgLoading}, user? ${!!user}, currentOrg? ${!!currentOrganization?.id}`
    );

    if (isOrgLoading || !user) { // +1
      console.log("[OrgPage Effect] Context or User loading...");
      if (organizationData || error) { // +1
         setOrganizationData(null);
         setError(null);
      }
      return; 
    }

    if (currentOrganization) { // +1
      const orgId = currentOrganization.id;

      if (organizationData?.id !== orgId && !isLoadingDetails) { // +1 (&&)
        console.log(`[OrgPage Effect] Context has org ${orgId}. Fetching details...`);
        setError(null);
        setOrganizationData(null);
        fetchOrganizationDetails(orgId);
      }
    } else { // +1
      console.log("[OrgPage Effect] No current organization in context.");
      if (organizationData || error) { // +1
        setOrganizationData(null);
        setError(null);
      }
    }
  }, [isOrgLoading, user, currentOrganization, organizationData, isLoadingDetails])

  const fetchOrganizationDetails = async (orgId: string) => {
    setIsLoadingDetails(true);
    setError(null);

    try { // +1
      console.log(`[OrgPage] Fetching details for org ID: ${orgId}`);
      
      const { data, error: fetchError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (fetchError) { // +1
        console.error('[OrgPage] Fetch error:', fetchError);
        throw new Error(fetchError.message || 'Erro ao carregar dados da organização');
      }

      console.log('[OrgPage] Organization data fetched:', data);
      setOrganizationData(data);
      
    } catch (err: any) {
      console.error('[OrgPage] Error in fetchOrganizationDetails:', err);
      setError(err.message || 'Erro desconhecido ao carregar dados da organização');
    } finally {
      setIsLoadingDetails(false);
    }
  }

  const showLoading = isOrgLoading || isLoadingDetails || (!organizationData && !error);

  return {
    organizationData,
    setOrganizationData,
    isLoadingDetails,
    error,
    showLoading,
    currentOrganization
  }
}
