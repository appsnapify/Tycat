import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface SuccessMessageProps {
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
}

export default function SuccessMessage({
  title,
  description,
  actionText,
  actionHref
}: SuccessMessageProps) {
  return (
    <div className="w-full max-w-md mx-auto p-8 space-y-6 text-center">
      <div className="flex justify-center">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      
      <h2 className="text-2xl font-bold">{title}</h2>
      
      <p className="text-muted-foreground">
        {description}
      </p>
      
      {actionText && actionHref && (
        <div className="pt-4">
          <Link href={actionHref}>
            <Button className="w-full">
              {actionText}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
} 