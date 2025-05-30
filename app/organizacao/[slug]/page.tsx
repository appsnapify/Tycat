// Server Component para resolver o problema de tipagem do Next.js 15
import OrganizationClient from './OrganizationClient'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function OrganizationPage(props: PageProps) {
  const resolvedParams = await props.params;
  return <OrganizationClient slug={resolvedParams.slug} />
} 