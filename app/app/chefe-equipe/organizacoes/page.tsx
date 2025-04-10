"use client"

import { Building } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function OrganizacoesPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Organizações</h1>
          <p className="text-muted-foreground">
            Gerencie as organizações vinculadas à sua equipe
          </p>
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gestão de Organizações</CardTitle>
          <CardDescription>
            Esta seção está em construção
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Building className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sistema de Organizações em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Esta funcionalidade estará disponível em breve. Aqui você poderá visualizar, vincular e 
            gerenciar organizações para os eventos da sua equipe.
          </p>
          <Button variant="outline" disabled>
            Funcionalidade em construção
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 