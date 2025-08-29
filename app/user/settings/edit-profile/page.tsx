'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientSidebar } from '@/components/client/ClientSidebar';
import { useClientAuth } from '@/contexts/client/ClientAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  birth_date: string;
  gender: 'M' | 'F' | 'O' | '';
  city: string;
  postal_code: string;
}

// ✅ COMPLEXIDADE: 5 pontos (1 base + 4 condições)
export default function EditProfilePage() {
  const { user, isLoading, isAuthenticated, updateUserData } = useClientAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    birth_date: '',
    gender: '',
    city: '',
    postal_code: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  // ✅ FUNÇÃO: Redirect logic (Complexidade: 2)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) { // +1
      router.push('/user/login');
    }
    
    if (user) { // +1
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
        birth_date: user.birth_date ? user.birth_date.toString().split('T')[0] : '',
        gender: user.gender || '',
        city: user.city || '',
        postal_code: user.postal_code || ''
      });
    }
  }, [isAuthenticated, isLoading, router, user]);

  // ✅ FUNÇÃO: Handle input change (Complexidade: 1)
  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ✅ FUNÇÃO: Handle save (Complexidade: 4)
  const handleSave = async () => {
    if (!user) return; // +1

    setIsSaving(true);
    
    try {
      const response = await fetch('/api/client/profile/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user.id,
          ...formData
        })
      });

      if (!response.ok) { // +1
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar perfil');
      }

      // Atualizar dados no contexto
      updateUserData({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        email: formData.email,
        birth_date: formData.birth_date ? new Date(formData.birth_date) : undefined,
        gender: formData.gender || undefined,
        city: formData.city || undefined,
        postal_code: formData.postal_code || undefined
      });
      
      toast.success('Perfil atualizado com sucesso!');
      router.push('/user/settings'); // +1
      
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar perfil'; // +1
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // User not authenticated
  if (!isAuthenticated || !user) { // +1
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <ClientSidebar />
      
      {/* Background decorativo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute top-40 right-40 w-80 h-80 bg-violet-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute bottom-40 left-20 w-60 h-60 bg-amber-200 rounded-full mix-blend-multiply filter blur-2xl opacity-15"></div>
      </div>

      <div className="relative z-10">
        <div className="px-4 sm:px-6 pb-16 sm:pb-20 max-w-2xl mx-auto pt-8">
          {/* Back Button */}
          <div className="mb-6">
            <Link href="/user/settings">
              <Button variant="ghost" className="text-slate-600 hover:text-slate-800 hover:bg-slate-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar às Definições
              </Button>
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
              Editar Perfil
            </h1>
            <p className="text-slate-600 text-lg">
              Atualize as suas informações pessoais.
            </p>
          </div>

          {/* Edit Form */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-800">
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Mantenha os seus dados atualizados para uma melhor experiência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium text-slate-700">
                    Primeiro Nome
                  </Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="Seu primeiro nome"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium text-slate-700">
                    Último Nome
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="Seu último nome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  Telemóvel
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="+351 9XX XXX XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  placeholder="seu.email@exemplo.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date" className="text-sm font-medium text-slate-700">
                    Data de Nascimento
                  </Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="gender" className="text-sm font-medium text-slate-700">
                    Género
                  </Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500">
                      <SelectValue placeholder="Selecione o género" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-sm font-medium text-slate-700">
                    Cidade
                  </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="Sua cidade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postal_code" className="text-sm font-medium text-slate-700">
                    Código Postal
                  </Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    className="bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                    placeholder="0000-000"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 flex-1"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Alterações
                    </>
                  )}
                </Button>
                
                <Link href="/user/settings">
                  <Button variant="outline" className="w-full sm:w-auto border-slate-200 text-slate-600 hover:bg-slate-50">
                    Cancelar
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
