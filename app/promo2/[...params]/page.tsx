// Este ficheiro representa a página pública OTIMIZADA de registo para uma guest list de evento.
// /promo2/[eventId]/[promoterId]/[teamId] - VERSÃO OTIMIZADA

import { notFound } from 'next/navigation';
import { processPromoParams } from '../../promo/actions';
import PromoterGuestListContentV2 from './PromoterGuestListContentV2';

// Interface para props da página
interface PageProps {
  params: Promise<{
    params: string[];
  }>;
}

// Server Component que captura parâmetros da URL
export default async function PromoterGuestListPageV2({ params }: PageProps) {
  // 🚀 OTIMIZAÇÃO: Simplificação para evitar recarregamentos desnecessários
  const resolvedParams = await params;
  const urlParams = resolvedParams?.params;
  
  // Validação inicial dos parâmetros
  if (!urlParams || urlParams.length !== 3) {
    notFound();
  }

  try {
    // Processar parâmetros e buscar dados (reutiliza a action do promo original)
    const data = await processPromoParams(urlParams);
    
    if (!data || !data.event) {
      console.error('[PROMO2] Dados do evento não encontrados');
      notFound();
    }

    return (
      <PromoterGuestListContentV2 
        event={data.event}
        params={urlParams}
        hasAssociation={data.hasAssociation}
        guestListStatus={data.guestListStatus}
      />
    );
  } catch (error) {
    console.error('[PROMO2] Erro ao processar página do promotor:', error);
    notFound();
  }
} 