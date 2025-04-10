"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useAuth } from '@/hooks/use-auth'
import Image from 'next/image'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Check,
  ChevronDown,
  Download,
  Filter,
  Search,
  Settings,
  Shield,
  UserPlus,
  Users,
  UserCog,
  BadgeCheck,
  Calendar,
  Clock,
  Share2,
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  UserX,
  Copy,
  CheckCheck
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { toast } from 'sonner'

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  avatar_url: string | null
  joined_at: string
  last_active: string
  performance: {
    events_attended: number
    sales: number
    commissions: number
  }
  status: 'active' | 'inactive'
}

export default function EquipePage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Gestão de Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros da sua equipe
          </p>
        </div>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            Esta seção está em construção
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <Users className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Gestão de Equipe em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Esta funcionalidade estará disponível em breve. Aqui você poderá visualizar e gerenciar 
            todos os membros da sua equipe, seus desempenhos e comissões.
          </p>
          <Button variant="outline" disabled>
            Funcionalidade em construção
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 