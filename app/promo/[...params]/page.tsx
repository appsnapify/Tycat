// Este ficheiro representa a página pública de registo para uma guest list de evento com rastreamento de promotor.
// [...params] captura /promo/[eventId]/[promoterId]/[teamId]

import { notFound } from 'next/navigation';
import { processPromoParams } from '../actions';
import PromoterGuestListContent from './PromoterGuestListContent';

// Interface para props da página
interface PageProps {
  params: Promise<{
    params: string[];
  }>;
}

// Server Component que captura parâmetros da URL
export default async function PromoterGuestListPage({ params }: PageProps) {
  // Await params before using its properties (Next.js 15 requirement)
  const resolvedParams = await params;
  const urlParams = resolvedParams?.params;
  
  // Validação inicial dos parâmetros
  if (!urlParams || urlParams.length !== 3) {
    notFound();
  }

  try {
    // Processar parâmetros e buscar dados
    const data = await processPromoParams(urlParams);
    
    if (!data || !data.event) {
      console.error('[ERROR] Dados do evento não encontrados');
      notFound();
    }

    return (
      <PromoterGuestListContent 
        event={data.event}
        params={urlParams}
        hasAssociation={data.hasAssociation}
        guestListStatus={data.guestListStatus}
      />
    );
  } catch (error) {
    console.error('[ERROR] Erro ao processar página do promotor:', error);
    notFound();
  }
} 