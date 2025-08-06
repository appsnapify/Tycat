import Link from 'next/link';
import { 
  LayoutDashboard, 
  Calendar,       // Para Eventos
  Ticket,         // Para Bilheteria
  CheckSquare,    // Para Check-in (CheckCircle já usado, CheckSquare é uma alternativa)
  Users,          // Para Equipes
  BarChart2,      // Para Relatórios
  Building,       // Para Organização
  Settings        // Para Configurações
} from 'lucide-react';
import { useAuth } from '@/app/app/_providers/auth-provider';

export function AppSidebar() {
  const { user } = useAuth();
  const userRole = user?.app_metadata?.role || '';

  const getNavLinks = (role: string) => {
    switch (role) {
      case 'organizador':
        const organizadorLinks = [
          { href: '/app/organizador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/app/organizador/eventos', label: 'Eventos', icon: Calendar },
          { href: '/app/organizador/bilheteria', label: 'Bilheteria', icon: Ticket },
          { href: '/app/organizador/check-in', label: 'Check-in', icon: CheckSquare },
          { href: '/app/organizador/equipes', label: 'Equipes', icon: Users },
          { href: '/app/organizador/relatorios', label: 'Relatórios', icon: BarChart2 },
          { href: '/app/organizador/organizacoes', label: 'Organização', icon: Building },
          { href: '/app/organizador/configuracao', label: 'Configurações', icon: Settings }
        ];
        return organizadorLinks;

      case 'chefe-equipe':
        return [
          { href: '/app/chefe-equipe/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/app/chefe-equipe/equipe', label: 'A Minha Equipa', icon: Users },
        ];
      case 'promotor':
        return [
          { href: '/app/promotor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks(userRole);

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-gray-800 dark:border-gray-700">
      <div className="h-full px-3 pb-4 overflow-y-auto bg-white dark:bg-gray-800">
        <ul className="space-y-2 font-medium">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="flex items-center p-2 text-gray-900 rounded-lg dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 group"
              >
                {link.icon && <link.icon className="w-5 h-5 text-gray-500 transition duration-75 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />}
                <span className="ms-3">{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
} 