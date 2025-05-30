// Este ficheiro representa a página pública de registo para uma guest list de evento.
// O [id] na URL é tratado como o eventId.

// Não precisamos de imports server-only se não buscarmos dados específicos do link aqui.
// import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
import { notFound } from 'next/navigation'; // notFound ainda pode ser útil se a validação falhar

// Importar o Client Component
import GuestListPageClient from './GuestListPageClient';

// Interface para props da página
interface PageProps {
  params: Promise<{ id: string }>;
}

// A função default é agora um Server Component simples que apenas passa o ID.
export default async function GuestListPage({ params }: PageProps) {
  // Await params before using its properties (Next.js 15 requirement)
  const resolvedParams = await params;
  const eventId = resolvedParams.id; // Tratar o ID da URL diretamente como eventId

  // Validação básica do ID (opcional, mas recomendado)
  if (!eventId) {
    notFound();
  }

  // Não fazemos busca de promoter_link aqui.
  // Passamos promoterId e teamId como null.

  // Renderizar o Client Component, passando os dados como props
  return (
      <GuestListPageClient
          eventId={eventId}
          promoterId={null} // Sempre null para esta rota direta
          teamId={null}     // Sempre null para esta rota direta
      />
  );
}

// REMOVER toda a definição antiga de GuestListPageContent e código associado (interfaces, schema, countries, etc.) que agora está em GuestListPageClient.tsx 