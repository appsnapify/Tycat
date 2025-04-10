"use client"

import { BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function FinanceiroPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Financeiro</h1>
          <p className="text-muted-foreground">
            Acompanhe as comissões e pagamentos da sua equipe
          </p>
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gestão Financeira</CardTitle>
          <CardDescription>
            Esta seção está em construção
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Sistema Financeiro em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Esta funcionalidade estará disponível em breve. Aqui você poderá acompanhar as comissões,
            pagamentos e extratos financeiros da sua equipe.
          </p>
          <Button variant="outline" disabled>
            Funcionalidade em construção
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 