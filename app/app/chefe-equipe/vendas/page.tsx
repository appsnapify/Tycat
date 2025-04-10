"use client"

import { ShoppingBag } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VendasPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe as vendas da sua equipe
          </p>
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gestão de Vendas</CardTitle>
          <CardDescription>
            Esta seção está em construção
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sistema de Vendas em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Esta funcionalidade estará disponível em breve. Aqui você poderá acompanhar todas as vendas
            realizadas pela sua equipe, estatísticas e métricas de desempenho.
          </p>
          <Button variant="outline" disabled>
            Funcionalidade em construção
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 