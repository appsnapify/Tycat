'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={() => router.back()} 
      className="flex items-center space-x-2"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      <span>Voltar</span>
    </Button>
  );
} 