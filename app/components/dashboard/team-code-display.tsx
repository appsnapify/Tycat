import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { QrCode, Copy, Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Componente para exibir e compartilhar o código da equipe
 * 
 * Permite que o chefe de equipe copie ou compartilhe facilmente o código
 * da equipe para que novos promotores possam ingressar.
 */
interface TeamCodeDisplayProps {
  teamCode: string | null
  title?: string
  description?: string
  footerText?: string
}

export function TeamCodeDisplay({
  teamCode,
  title = 'Código da Equipe',
  description = 'Use este código para convidar novos promotores',
  footerText = ''
}: TeamCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  
  // Verificar se há um código de equipe válido
  const hasValidCode = teamCode && teamCode.trim().length > 0
  
  // Função para copiar o código para a área de transferência
  const copyToClipboard = () => {
    if (!hasValidCode) {
      toast.error('Nenhum código de equipe disponível para copiar')
      return
    }
    
    try {
      navigator.clipboard.writeText(teamCode as string)
      setCopied(true)
      toast.success('Código copiado para área de transferência!')
      
      // Resetar o estado após 2 segundos
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (error) {
      console.error('Erro ao copiar código:', error)
      toast.error('Não foi possível copiar o código')
    }
  }
  
  // Função para compartilhar o código usando a API Web Share (se disponível)
  const shareCode = () => {
    if (!hasValidCode) {
      toast.error('Nenhum código de equipe disponível para compartilhar')
      return
    }
    
    // Verificar se a API Web Share está disponível
    if (navigator.share) {
      navigator.share({
        title: 'Código da Equipe',
        text: `Use este código para entrar na minha equipe: ${teamCode}`
      })
      .then(() => toast.success('Código compartilhado!'))
      .catch((error) => {
        console.error('Erro ao compartilhar:', error)
        toast.error('Não foi possível compartilhar o código')
      })
    } else {
      // Fallback para sistemas que não suportam compartilhamento
      copyToClipboard()
      toast.info('Código copiado! Use seu aplicativo de mensagens para compartilhar.')
    }
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32 bg-muted/20 rounded-lg flex items-center justify-center mb-4">
          <QrCode className="w-12 h-12 text-muted-foreground opacity-50" />
        </div>
        
        <div className="bg-muted w-full text-center p-3 rounded-md text-lg font-medium mb-3 relative overflow-hidden">
          {hasValidCode ? teamCode : 'Código não disponível'}
          {!hasValidCode && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Código não disponível</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 w-full">
          <Button 
            onClick={copyToClipboard} 
            variant="outline" 
            className="flex-1"
            disabled={!hasValidCode}
          >
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
          
          <Button 
            onClick={shareCode} 
            variant="default" 
            className="flex-1"
            disabled={!hasValidCode}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </CardContent>
      
      {footerText && (
        <CardFooter className="border-t px-6 py-4">
          <p className="text-sm text-muted-foreground w-full text-center">
            {footerText}
          </p>
        </CardFooter>
      )}
    </Card>
  )
} 