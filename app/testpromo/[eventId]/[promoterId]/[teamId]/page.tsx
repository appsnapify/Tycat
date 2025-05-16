interface PageProps {
  params: { 
    eventId: string;
    promoterId: string;
    teamId: string;
  }; 
}

export default async function TestPromoNamedPage({ params }: PageProps) {
  console.log('DEBUG (testpromo-named): Dentro da TestPromoNamedPage - Inicio');
  try {
    // Acesso direto aos params, sem necessidade de await params.params
    const { eventId, promoterId, teamId } = params; 
    
    console.log('DEBUG (testpromo-named): eventId recebido:', eventId);
    console.log('DEBUG (testpromo-named): promoterId recebido:', promoterId);
    console.log('DEBUG (testpromo-named): teamId recebido:', teamId);
    
    if (!eventId || !promoterId || !teamId) {
      return <div>Parâmetros nomeados em falta.</div>;
    }
        
    return (
      <div>
        <h1>Página de Teste Mínimo com Parâmetros Nomeados (/testpromo-named)</h1>
        <p>Event ID: {eventId}</p>
        <p>Promoter ID: {promoterId}</p>
        <p>Team ID: {teamId}</p>
      </div>
    );
  } catch (error) {
    console.error('DEBUG (testpromo-named): Erro ao processar params:', error);
    return <div>Erro ao processar parâmetros nomeados na página de teste.</div>;
  }
} 