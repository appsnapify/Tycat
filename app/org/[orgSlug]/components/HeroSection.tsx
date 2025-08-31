import Image from 'next/image'

interface Organization {
  id: string
  name: string
  address: string
  logo_url: string
  banner_url: string
}

interface HeroSectionProps {
  organization: Organization
}

export default function HeroSection({ organization }: HeroSectionProps) {
  return (
    <>
      {/* TYCAT Logo - posicionamento absoluto no topo */}
      <div className="absolute top-6 right-6 z-30">
        <div className="text-xl sm:text-2xl font-black bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent drop-shadow-lg">
          TYCAT
        </div>
      </div>

      {/* Hero Section MCP 21st - Compacto e Moderno */}
                   <section className="relative h-56 sm:h-64 md:h-72 overflow-hidden">
        {/* Banner de fundo */}
        <div className="absolute inset-0">
          {organization.banner_url ? (
            <Image
              src={organization.banner_url}
              alt={`Banner ${organization.name}`}
              fill
              className="object-cover object-center"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-600 via-violet-600 to-slate-800">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/20 to-black/40"></div>
            </div>
          )}
        </div>

        {/* Overlay moderno */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>

        {/* Conteúdo centralizado */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            {/* Logo da organização - inline */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden border-3 border-white/80 shadow-2xl mx-auto mb-4 backdrop-blur-sm bg-white/10">
              {organization.logo_url ? (
                <Image
                  src={organization.logo_url}
                  alt={`Logo ${organization.name}`}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                  priority
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    {organization.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Nome da organização */}
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-lg">
              {organization.name}
            </h1>
            
            {/* Endereço */}
            {organization.address && (
              <p className="text-white/90 text-sm sm:text-base md:text-lg font-medium drop-shadow-md">
                {organization.address}
              </p>
            )}
          </div>
        </div>

        {/* Elementos decorativos MCP 21st */}
        <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30 rounded-lg rotate-45"></div>
        <div className="absolute bottom-4 right-4 w-6 h-6 bg-emerald-500/60 rounded-full"></div>
        <div className="absolute top-1/2 left-8 w-2 h-12 bg-gradient-to-b from-violet-400/60 to-transparent rounded-full"></div>
      </section>

      {/* Transição MCP 21st */}
      <div className="h-2 bg-gradient-to-b from-transparent to-slate-50/30"></div>
    </>
  )
}
