"use client"

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, PlusCircle } from 'lucide-react'

export default function EscolhaEquipePage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-8">Bem-vindo ao SNAP!</h1>
      <p className="text-center text-gray-600 mb-8">
        Para começar, escolha se deseja criar uma nova equipe ou juntar-se a uma existente
      </p>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {/* Card para Criar Equipe */}
        <Card className="relative overflow-hidden border-2 hover:border-lime-500 transition-all cursor-pointer"
              onClick={() => router.push('/app/promotor/equipes/criar')}>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-lime-500 to-lime-600" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-6 w-6 text-lime-500" />
              Criar Nova Equipe
            </CardTitle>
            <CardDescription>
              Crie sua própria equipe e torne-se um líder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Defina seu próprio código de equipe</li>
              <li>• Gerencie seus membros</li>
              <li>• Estabeleça metas e objetivos</li>
              <li>• Acompanhe o desempenho da equipe</li>
            </ul>
            <Button variant="outline" className="w-full mt-4 border-lime-500 text-lime-600 hover:bg-lime-50">
              Criar Equipe
            </Button>
          </CardContent>
        </Card>

        {/* Card para Juntar-se a Equipe */}
        <Card className="relative overflow-hidden border-2 hover:border-fuchsia-500 transition-all cursor-pointer"
              onClick={() => router.push('/app/promotor/equipes/ingressar')}>
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-fuchsia-500 to-fuchsia-600" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-6 w-6 text-fuchsia-500" />
              Juntar-se a uma Equipe
            </CardTitle>
            <CardDescription>
              Faça parte de uma equipe existente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Use um código de convite</li>
              <li>• Conecte-se com outros promotores</li>
              <li>• Participe de eventos em equipe</li>
              <li>• Contribua para o sucesso coletivo</li>
            </ul>
            <Button variant="outline" className="w-full mt-4 border-fuchsia-500 text-fuchsia-600 hover:bg-fuchsia-50">
              Juntar-se a Equipe
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 