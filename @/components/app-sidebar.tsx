import { LayoutDashboard, Building, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export function AppSidebar() {
  const { user } = useAuth();
  const userRole = user?.app_metadata?.role || ''; // Obter role

  const getNavLinks = (role: string) => {
    switch (role) {
      case 'organizador':
        return [
          { href: '/app/organizador/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/app/organizador/organizations', label: 'Organizações', icon: Building },
        ];
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
    <aside className="...">
      <nav className="...">
        {navLinks.map((link) => (
          // ... renderização do link ...
          <Link key={link.href} href={link.href} className="...">
            <link.icon className="..." />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
} 