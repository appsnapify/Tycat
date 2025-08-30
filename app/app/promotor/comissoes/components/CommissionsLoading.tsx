import { Card, CardContent, CardHeader } from '@/components/ui/card'

// ✅ COMPONENTE DE LOADING (Complexidade: 1 ponto)
export const CommissionsLoading = () => {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Comissões</h1>
      <div className="grid grid-cols-1 gap-6">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="animate-pulse">
            <CardHeader className="bg-muted/40 h-12"></CardHeader>
            <CardContent className="p-6">
              <div className="h-48 bg-muted/40 rounded-md"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
