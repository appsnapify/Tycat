import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Copy, QrCode, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface TeamCodeDisplayProps {
  teamCode: string | null
  title: string
  description: string
  footerText?: string
}

export function TeamCodeDisplay({
  teamCode,
  title,
  description,
  footerText
}: TeamCodeDisplayProps) {
  const [copied, setCopied] = useState(false)
  
  const copyTeamCode = () => {
    if (teamCode) {
      navigator.clipboard.writeText(teamCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success('Código da equipa copiado!')
    }
  }
  
  const shareTeamCode = () => {
    if (teamCode && navigator.share) {
      navigator.share({
        title: 'Código da minha equipa',
        text: `Junta-te à minha equipa no Snap usando o código: ${teamCode}`,
      }).catch(() => {
        // Fallback if sharing fails
        copyTeamCode()
      })
    } else {
      // Fallback for browsers that don't support Web Share API
      copyTeamCode()
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
      <CardContent>
        <div className="flex flex-col gap-3">
          <div className="bg-muted p-4 rounded-md font-mono text-center text-lg">
            {teamCode || 'CODIGO'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              onClick={copyTeamCode}
              className="w-full"
            >
              {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              Copiar
            </Button>
            <Button 
              variant="outline" 
              onClick={shareTeamCode}
              className="w-full"
            >
              <Share2 className="mr-2 h-4 w-4" />
              Partilhar
            </Button>
          </div>
        </div>
      </CardContent>
      {footerText && (
        <CardFooter className="border-t px-6 py-4 text-sm text-muted-foreground">
          {footerText}
        </CardFooter>
      )}
    </Card>
  )
}

export default TeamCodeDisplay 