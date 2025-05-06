'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function MigrationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  const runMigrations = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/admin/run-migrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao executar migrações');
      }
      
      setResults(data.results || []);
      toast.success('Migrações executadas com sucesso');
    } catch (error) {
      console.error('Erro ao executar migrações:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao executar migrações');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Gerenciamento de Migrações</CardTitle>
          <CardDescription>
            Execute as migrações pendentes na base de dados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-6">
            <Button 
              onClick={runMigrations} 
              disabled={isLoading}
              className="w-full md:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando migrações...
                </>
              ) : (
                'Executar Migrações'
              )}
            </Button>
            
            {results.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Resultados:</h3>
                <ul className="space-y-2">
                  {results.map((result, index) => (
                    <li key={index} className={`p-2 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="font-medium">{result.migrationName}</p>
                      <p className="text-sm">{result.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 