'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';
import Link from 'next/link';

interface ClientUser {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  city?: string | null;
  postal_code?: string | null;
}

interface UserProfileCardProps {
  user: ClientUser;
}

// ✅ FUNÇÃO: Format gender (Complexidade: 2)
function formatGender(gender: string): string {
  if (gender === 'M') return 'Masculino'; // +1
  if (gender === 'F') return 'Feminino'; // +1
  return 'Outro';
}

// ✅ COMPONENTE: User Profile Card (Complexidade: 1)
export function UserProfileCard({ user }: UserProfileCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white/50 backdrop-blur-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
          <User className="w-5 h-5 mr-3 text-emerald-600" />
          Perfil
        </CardTitle>
        <CardDescription>
          Edite as suas informações pessoais e dados de contacto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Nome</p>
              <p className="text-slate-600">{user.first_name} {user.last_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Telemóvel</p>
              <p className="text-slate-600">{user.phone}</p>
            </div>
            {user.email && (
              <div>
                <p className="text-sm font-medium text-slate-700">Email</p>
                <p className="text-slate-600">{user.email}</p>
              </div>
            )}
            {user.birth_date && (
              <div>
                <p className="text-sm font-medium text-slate-700">Data de Nascimento</p>
                <p className="text-slate-600">{new Date(user.birth_date).toLocaleDateString('pt-PT')}</p>
              </div>
            )}
            {user.gender && (
              <div>
                <p className="text-sm font-medium text-slate-700">Género</p>
                <p className="text-slate-600">{formatGender(user.gender)}</p>
              </div>
            )}
            {user.city && (
              <div>
                <p className="text-sm font-medium text-slate-700">Cidade</p>
                <p className="text-slate-600">{user.city}</p>
              </div>
            )}
            {user.postal_code && (
              <div>
                <p className="text-sm font-medium text-slate-700">Código Postal</p>
                <p className="text-slate-600">{user.postal_code}</p>
              </div>
            )}
          </div>
          <div className="pt-4">
            <Link href="/user/settings/edit-profile">
              <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                Editar Perfil
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
