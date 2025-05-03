'use client'

import React from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Ticket, BarChart2, Users, Zap, LayoutDashboard, ClipboardList, CheckCircle, LucideIcon } from 'lucide-react'

// Cores (Mantendo Creatifest)
const colors = {
  background: 'bg-black',
  textPrimary: 'text-white',
  textSecondary: 'text-gray-400',
  accentLime: 'text-lime-400',
  accentMagenta: 'text-fuchsia-500',
  bgAccentLime: 'bg-lime-400',
  bgAccentMagenta: 'bg-fuchsia-500',
  borderLime: 'border-lime-400',
  borderGray: 'border-gray-700',
  bgGrayPlaceholder: 'bg-gray-800/50',
}

// Navbar (Pode ser um componente separado)
const Navbar = () => (
  <nav className={`flex justify-between items-center p-4 ${colors.borderGray} border-b sticky top-0 z-50 bg-black/80 backdrop-blur-sm`}>
    <Link href="/" className={`${colors.accentLime} font-bold text-lg md:text-xl`}>SNAPIFY</Link>
    <div>
      <Link href="/login">
        <Button variant="ghost" className={`mr-2 text-sm md:text-base ${colors.textSecondary} hover:${colors.textPrimary}`}>Login</Button>
      </Link>
      <Link href="/register">
        <Button className={`${colors.bgAccentLime} text-black hover:${colors.bgAccentLime}/90 text-sm md:text-base px-3 md:px-4 py-1.5 md:py-2`}>Criar Conta</Button>
      </Link>
    </div>
  </nav>
)

// Secção Herói
const HeroSection = () => (
  <section className="text-center pt-24 pb-16 md:pt-32 md:pb-24 px-4">
    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight">
      Gestão Completa de <span className={colors.accentLime}>Eventos</span>, Equipas e <span className={colors.accentMagenta}>Bilhetes.</span>
    </h1>
    <p className={`${colors.textSecondary} mb-8 text-base md:text-lg max-w-xl md:max-w-3xl mx-auto`}>
      Potencialize seus eventos com ferramentas intuitivas para <span className={colors.accentLime}>guest lists</span>, venda de <span className={colors.accentMagenta}>bilhetes</span> online, gestão de <span className={colors.accentLime}>promotores e equipas</span>, e relatórios detalhados.
    </p>
    <Link href="/register">
      <Button size="lg" className={`${colors.bgAccentLime} text-black hover:${colors.bgAccentLime}/90 px-6 md:px-8 py-2.5 md:py-3 text-base md:text-lg`}>
        Começar Gratuitamente
      </Button>
    </Link>
  </section>
)

// Secção Vantagens
const AdvantagesSection = () => (
   <section className="py-16 md:py-20 px-4">
     <div className="max-w-5xl mx-auto text-center mb-12 md:mb-16">
       <h2 className="text-3xl md:text-4xl font-bold mb-4">Plataforma <span className={colors.accentLime}>Tudo-em-Um</span> para Organizadores</h2>
       <p className={`${colors.textSecondary} text-base md:text-lg`}>Simplifique cada etapa do seu evento.</p>
     </div>
     <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
       {/* Vantagem 1: Bilhetes */}
       <div className={`text-center p-5 md:p-6 ${colors.borderGray} border rounded-lg hover:${colors.borderLime} transition-colors duration-300`}>
         <Ticket className={`h-10 w-10 ${colors.accentLime} mx-auto mb-4`} />
         <h3 className="text-lg md:text-xl font-semibold mb-2">Bilhetes & Guest Lists</h3>
         <p className={`${colors.textSecondary} text-sm`}>Crie bilhetes pagos ou guest lists gratuitas com controlo de capacidade e opções personalizadas.</p>
       </div>
       {/* Vantagem 2: Equipas */}
       <div className={`text-center p-5 md:p-6 ${colors.borderGray} border rounded-lg hover:${colors.borderLime} transition-colors duration-300`}>
         <Users className={`h-10 w-10 ${colors.accentMagenta} mx-auto mb-4`} />
         <h3 className="text-lg md:text-xl font-semibold mb-2">Equipas & Promotores</h3>
         <p className={`${colors.textSecondary} text-sm`}>Organize suas equipas, convide promotores, atribua eventos e acompanhe o desempenho.</p>
       </div>
       {/* Vantagem 3: Relatórios */}
       <div className={`text-center p-5 md:p-6 ${colors.borderGray} border rounded-lg hover:${colors.borderLime} transition-colors duration-300`}>
         <BarChart2 className={`h-10 w-10 ${colors.accentLime} mx-auto mb-4`} />
         <h3 className="text-lg md:text-xl font-semibold mb-2">Analytics Detalhados</h3>
         <p className={`${colors.textSecondary} text-sm`}>Visualize vendas, check-ins, desempenho de promotores e mais, tudo em tempo real.</p>
       </div>
       {/* Vantagem 4: Facilidade */}
       <div className={`text-center p-5 md:p-6 ${colors.borderGray} border rounded-lg hover:${colors.borderLime} transition-colors duration-300`}>
         <CheckCircle className={`h-10 w-10 ${colors.accentMagenta} mx-auto mb-4`} />
         <h3 className="text-lg md:text-xl font-semibold mb-2">Simplicidade e Controlo</h3>
         <p className={`${colors.textSecondary} text-sm`}>Interface intuitiva e ferramentas poderosas que colocam você no comando do seu evento.</p>
       </div>
     </div>
   </section>
)

// Interface para o componente FeatureSection
interface FeatureSectionProps {
  title: string;
  description: string;
  highlightWords?: string[];
  buttonText: string;
  buttonLink: string;
  icon: LucideIcon;
  accentColor: string;
  imagePlaceholderIcon: LucideIcon;
  imageAccentColor: string;
  reverse?: boolean;
}

// Secção de Funcionalidade (Componente reutilizável)
const FeatureSection = ({ 
  title, 
  description, 
  highlightWords = [] as string[], 
  buttonText, 
  buttonLink, 
  icon: Icon, 
  accentColor, 
  imagePlaceholderIcon: PlaceholderIcon, 
  imageAccentColor, 
  reverse = false 
}: FeatureSectionProps) => {
  const renderDescription = () => {
    let currentDesc = description;
    highlightWords.forEach(word => {
      // Cria uma expressão regular segura para a palavra, incluindo a verificação de limites de palavra
      const regex = new RegExp(`\b(${word})\b`, 'gi'); 
      currentDesc = currentDesc.replace(regex, `<span class="${colors.accentLime}">$1</span>`);
    });
    // Usar dangerouslySetInnerHTML requer cuidado, mas é necessário para renderizar o HTML do span
    // Certifique-se que `description` e `highlightWords` vêm de fontes seguras
    return { __html: currentDesc };
  };

  return (
    <section className="py-16 md:py-20 px-4">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className={`${reverse ? 'order-first md:order-last' : ''}`}>
          <div className={`${accentColor} font-semibold mb-2 text-sm tracking-wider`}>{title}</div>
          {/* Título com span renderizado corretamente */}
          <h2 className="text-3xl md:text-4xl font-bold mb-5" dangerouslySetInnerHTML={renderDescription()} />
          <p className={`${colors.textSecondary} mb-6 text-base md:text-lg`}>
            {/* A descrição principal deve ir aqui se a versão acima não for desejada */} 
          </p>
          <Button variant="outline" className={`${colors.borderLime} ${colors.accentLime} hover:${colors.bgAccentLime} hover:text-black px-5 py-2`}>
            {buttonText}
          </Button>
        </div>
        <div className={`${colors.bgGrayPlaceholder} ${colors.borderGray} border p-6 md:p-8 rounded-lg h-64 md:h-80 flex items-center justify-center ${colors.textSecondary} text-center ${reverse ? 'order-last md:order-first' : ''}`}>
           <PlaceholderIcon className={`h-16 w-16 ${imageAccentColor} opacity-30 mb-4`} />
           {/* Idealmente usar <Image> do Next.js aqui */}
        </div>
      </div>
    </section>
  )
}

// Mantendo a abordagem com next/dynamic por enquanto, pois os componentes estão no mesmo ficheiro
const TestimonialsSection = dynamic(() => Promise.resolve(() => (
  <section className={`py-16 md:py-24 px-4 ${colors.bgAccentLime}`}>
    <div className="max-w-5xl mx-auto text-center text-black">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-2">O Que Dizem Os Organizadores</h2>
      <h3 className="text-3xl md:text-4xl font-bold mb-12">Confiança e Resultados Comprovados</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Testemunho 1 */}
        <div className="bg-black/10 p-6 rounded-lg text-left shadow-md">
          <p className="mb-4 text-base">"Desde que usamos esta plataforma, a gestão dos nossos eventos ficou muito mais simples e eficiente. Os relatórios são fantásticos!"</p>
          <p className="font-bold">- Nome Organizador 1</p>
          <p className="text-sm opacity-80">Produtora de Eventos X</p>
        </div>
        {/* Testemunho 2 */}
        <div className="bg-black/10 p-6 rounded-lg text-left shadow-md">
          <p className="mb-4 text-base">"A facilidade em criar e gerir diferentes tipos de bilhetes é um ponto forte. O suporte também é excelente."</p>
          <p className="font-bold">- Nome Organizador 2</p>
          <p className="text-sm opacity-80">Organização Festival Y</p>
        </div>
        {/* Testemunho 3 */}
        <div className="bg-black/10 p-6 rounded-lg text-left shadow-md">
          <p className="mb-4 text-base">"Conseguimos aumentar as nossas vendas online significativamente graças às ferramentas de promoção integradas."</p>
          <p className="font-bold">- Nome Organizador 3</p>
          <p className="text-sm opacity-80">Espaço Cultural Z</p>
        </div>
      </div>
    </div>
  </section>
)), { ssr: false })

const Footer = dynamic(() => Promise.resolve(() => (
  <footer className={`${colors.borderGray} border-t py-10 px-4 mt-10`}>
     <div className={`max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-sm ${colors.textSecondary}`}>
        {/* Colunas do Footer */}
        <div>
          <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Plataforma</h4>
          <ul>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Organizador</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Promotor</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Preços</li>
          </ul>
        </div>
        <div>
          <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Empresa</h4>
          <ul>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Sobre Nós</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Blog</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Contacto</li>
          </ul>
        </div>
        <div>
          <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Recursos</h4>
          <ul>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Documentação</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Guias</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Suporte</li>
          </ul>
        </div>
        <div>
          <h4 className={`${colors.textPrimary} font-semibold mb-3 text-base`}>Legal</h4>
          <ul>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Termos</li>
            <li className={`mb-2 hover:${colors.accentLime} cursor-pointer`}>Privacidade</li>
          </ul>
        </div>
      </div>
      <div className={`text-center ${colors.textSecondary} mt-12 text-xs`}>
        © {new Date().getFullYear()} SNAPIFY. Todos os direitos reservados.
      </div>
  </footer>
)), { ssr: false })

export default function TestePageOrganizadorOptimized() {
  return (
    <div className={`${colors.background} ${colors.textPrimary} min-h-screen overflow-x-hidden`}>
      <Navbar />
      <HeroSection />
      <AdvantagesSection />

       {/* Usando o componente FeatureSection reutilizável */}
       <FeatureSection
         title="VISÃO CENTRALIZADA"
         description="Dashboard Inteligente, Decisões Rápidas."
         highlightWords={["Inteligente"]}
         buttonText="Explorar o Dashboard"
         buttonLink="#"
         icon={LayoutDashboard} // Icon não usado diretamente no componente atual, mas pode ser útil
         accentColor={colors.accentMagenta} // Cor do título da seção
         imagePlaceholderIcon={LayoutDashboard}
         imageAccentColor={colors.accentLime} // Cor do ícone no placeholder
       />
       <FeatureSection
         title="BILHETES E GUEST LISTS"
         description="Flexibilidade Total para Seu Acesso."
         highlightWords={["Total"]}
         buttonText="Ver Funcionalidades"
         buttonLink="#"
         icon={ClipboardList}
         accentColor={colors.accentMagenta}
         imagePlaceholderIcon={ClipboardList}
         imageAccentColor={colors.accentMagenta}
         reverse={true}
       />

      {/* Secção CTA (Pode ser componentizada também) */}
      <section className="text-center py-20 md:py-28 px-4">
         <h2 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
          Pronto para <span className={colors.accentLime}>Transformar</span> Seus Eventos?
         </h2>
         <p className={`${colors.textSecondary} mb-10 text-base md:text-lg max-w-xl mx-auto`}>
           Simplifique a gestão, envolva promotores e venda mais bilhetes. Crie a sua conta de organizador e experimente gratuitamente.
         </p>
         <Link href="/register">
           <Button size="lg" className={`${colors.bgAccentLime} text-black hover:${colors.bgAccentLime}/90 px-8 md:px-10 py-3 md:py-3.5 text-base md:text-lg`}>
             Criar Conta de Organizador
           </Button>
         </Link>
      </section>

      {/* Componentes carregados dinamicamente */} 
      {/* <React.Suspense fallback={<div>Carregando...</div>}> */}
        <TestimonialsSection />
        <Footer />
      {/* </React.Suspense> */} 
    </div>
  )
} 