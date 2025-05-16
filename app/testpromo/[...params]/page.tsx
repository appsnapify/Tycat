// app/testpromo/[...params]/page.tsx

interface PageProps {
  params: { params: string[] | Promise<string[]> };
}

export default async function TestPromoPage({ params }: PageProps) {
  console.log('DEBUG (testpromo): Dentro da TestPromoPage - Inicio');
  try {
    const urlParams = await params.params;
    console.log('DEBUG (testpromo): urlParams recebidos:', urlParams);
    
    if (!urlParams || urlParams.length < 1) { // Ajustado para aceitar qualquer número de params para simplificar
      return <div>Parâmetros inválidos (quantidade). Esperado pelo menos 1.</div>;
    }
    
    const [param1, param2, param3] = urlParams; // Apenas para exemplo, podem ser menos
    console.log('DEBUG (testpromo): param1:', param1);
    if (param2) console.log('DEBUG (testpromo): param2:', param2);
    if (param3) console.log('DEBUG (testpromo): param3:', param3);
    
    return (
      <div>
        <h1>Página de Teste Mínimo (/testpromo)</h1>
        <p>Parâmetros Recebidos:</p>
        <ul>
          {urlParams.map((p, index) => (
            <li key={index}>Param {index + 1}: {p}</li>
          ))}
        </ul>
      </div>
    );
  } catch (error) {
    console.error('DEBUG (testpromo): Erro ao processar params:', error);
    return <div>Erro ao processar parâmetros na página de teste.</div>;
  }
} 