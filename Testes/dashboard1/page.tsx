// Cole este código em: app/app/dashboard1/page.tsx

"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, DollarSign, Users, Activity, BarChart3, ListChecks, Building } from 'lucide-react' // Adicionado Building

// --- Dados Fictícios ---
const kpiData = [
  { title: 'Receita Total', value: '€12,450', change: '+15.2%', icon: DollarSign, color: 'bg-gradient-to-tr from-green-500 to-emerald-600', textColor: 'text-white' },
  { title: 'Novos Clientes', value: '234', change: '+25', icon: Users, color: 'bg-gradient-to-tr from-blue-500 to-cyan-600', textColor: 'text-white' },
  { title: 'Eventos Ativos', value: '5', change: '-1', icon: Activity, color: 'bg-gradient-to-tr from-purple-500 to-violet-600', textColor: 'text-white' },
  { title: 'Tarefas Pendentes', value: '18', change: '+3', icon: ListChecks, color: 'bg-gradient-to-tr from-amber-500 to-orange-600', textColor: 'text-white' }
]

const recentActivity = [
  { id: 1, user: 'Ana Silva', action: 'Criou novo evento "Sunset Party"', time: '5 min atrás', type: 'evento' },
  { id: 2, user: 'Carlos Mendes', action: 'Associou a Equipa Alpha', time: '25 min atrás', type: 'equipa' },
  { id: 3, user: 'Sistema', action: 'Pagamento de comissão processado', time: '1 hora atrás', type: 'pagamento' },
  { id: 4, user: 'Sofia Lima (Equipa Beta)', action: 'Registou 15 convidados', time: '3 horas atrás', type: 'convidado' },
  { id: 5, user: 'Jorge Ferreira', action: 'Atualizou detalhes da organização', time: '5 horas atrás', type: 'organizacao' }
]

// Estilos para diferentes tipos de atividade (cores Tailwind)
const activityTypeStyles: Record<string, { color: string, icon: React.ElementType }> = {
  'evento': { color: 'bg-blue-100 text-blue-800', icon: Activity },
  'equipa': { color: 'bg-purple-100 text-purple-800', icon: Users },
  'pagamento': { color: 'bg-green-100 text-green-800', icon: DollarSign },
  'convidado': { color: 'bg-pink-100 text-pink-800', icon: Users }, // Cor diferente para convidado
  'organizacao': { color: 'bg-indigo-100 text-indigo-800', icon: Building }, // Cor e ícone para organização
  'default': { color: 'bg-gray-100 text-gray-800', icon: Activity },
}

// --- Componente do Dashboard ---

export default function TestDashboardPage() {

  return (
    // Fundo geral com gradiente suave
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-100 to-stone-100 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">

        {/* Cabeçalho */}
        <header className="mb-8 md:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-1">
            Dashboard Moderno <span className="text-indigo-600">(Visualização 1)</span> {/* Alterado nome */}
          </h1>
          <p className="text-lg text-muted-foreground">
            Uma visão geral com um toque de cor e estilo.
          </p>
        </header>

        {/* KPIs */}
        <section className="mb-8 md:mb-12">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {kpiData.map((kpi, index) => (
              // Cards de KPI com gradientes e sombra
              <Card key={index} className={`overflow-hidden shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${kpi.color} ${kpi.textColor} border-none rounded-xl`}>
                <CardHeader className="pb-2 pt-5 px-5"> {/* Ajuste de Padding */}
                  <div className="flex justify-between items-start">
                    <CardDescription className="text-sm font-medium text-inherit opacity-80">
                      {kpi.title}
                    </CardDescription>
                    <kpi.icon className="h-5 w-5 text-inherit opacity-70" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5"> {/* Ajuste de Padding */}
                  <div className="text-3xl font-bold mb-1">{kpi.value}</div>
                  <p className={`text-xs font-medium text-inherit opacity-90 flex items-center ${kpi.change.startsWith('+') ? 'text-green-300' : 'text-red-300'}`}>
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    {kpi.change} <span className="font-normal opacity-70 ml-1">vs mês anterior</span>
                  </p>
                </CardContent>
              </Card>
            ))}\
          </div>
        </section>

        {/* Gráfico e Atividade Recente */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Gráfico (Placeholder) */}
          <Card className="lg:col-span-2 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center text-lg"> {/* Tamanho do Título */}
                <BarChart3 className="h-5 w-5 mr-2 text-indigo-600" />
                Desempenho da Equipa (Simulado)
              </CardTitle>
              <CardDescription>Visualização do progresso nos últimos 6 meses.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2 pr-4 pb-4"> {/* Padding ajustado */}
              {/* Placeholder visual para o gráfico */}
              <div className="h-72 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200">
                <BarChart3 className="h-16 w-16 opacity-50" />
                <span className="ml-4 font-medium">Gráfico Simulado (Recharts)</span>
              </div>
            </CardContent>
          </Card>

          {/* Atividade Recente */}
          <Card className="lg:col-span-1 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg">Atividade Recente</CardTitle> {/* Tamanho do Título */}
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {recentActivity.map((activity) => {
                  const style = activityTypeStyles[activity.type] || activityTypeStyles['default'];
                  const Icon = style.icon;
                  return (
                    <li key={activity.id} className="flex items-start space-x-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"> {/* Linha separadora */}
                      {/* Ícone com fundo colorido */}
                      <div className={`mt-1 flex-shrink-0 p-1.5 rounded-full ${style.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.user}</p>
                        <p className="text-sm text-gray-600">{activity.action}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                      </div>
                      {/* Badge do tipo de atividade */}
                      <Badge variant="outline" className={`hidden sm:inline-flex text-xs capitalize font-medium ${style.color} border-none px-2 py-0.5`}>
                        {activity.type}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
              <Button variant="outline" size="sm" className="w-full mt-6 border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"> {/* Botão estilizado */}
                  Ver Toda Atividade
              </Button>
            </CardContent>
          </Card>

        </section>

      </div>
    </div>
  )
}