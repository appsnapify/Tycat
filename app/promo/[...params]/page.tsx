// Este ficheiro representa a página pública OFICIAL de registo para uma guest list de evento.
// /promo/[eventId]/[promoterId]/[teamId] - VERSÃO OTIMIZADA OFICIAL

import { notFound } from 'next/navigation';
import { processPromoParams } from '../actions';
import PromoterGuestListContentV2 from './PromoterGuestListContentV2';

// Interface para props da página
interface PageProps {
  params: Promise<{
    params: string[];
  }>;
}

// Server Component que captura parâmetros da URL
export default async function PromoterGuestListPageV2({ params }: PageProps) {
  try {
    // 🚀 OTIMIZAÇÃO: Aguardar resolução dos parâmetros
    const resolvedParams = await params;
    const urlParams = resolvedParams?.params;
    
    // Validação inicial dos parâmetros
    if (!urlParams || urlParams.length !== 3) {
      console.error('[PROMO] Parâmetros inválidos:', urlParams);
      notFound();
    }

    // Processar parâmetros e buscar dados
    const data = await processPromoParams(urlParams);
    
    if (!data || !data.event) {
      console.error('[PROMO] Dados do evento não encontrados');
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
    console.error('[PROMO] Erro ao processar página do promotor:', error);
    notFound();
  }
} 