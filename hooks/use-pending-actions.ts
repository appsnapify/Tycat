import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

/**
 * Hook para gerenciar ações pendentes após o login
 * Este hook verifica o sessionStorage por ações salvas antes do redirecionamento para login
 * e executa ações apropriadas após o login bem-sucedido
 */
export function usePendingActions() {
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se existe uma ação pendente no sessionStorage
    const pendingActionJSON = sessionStorage.getItem('pendingAction');
    if (!pendingActionJSON) return;

    try {
      const pendingAction = JSON.parse(pendingActionJSON);
      
      // Limpar a ação pendente do sessionStorage
      sessionStorage.removeItem('pendingAction');

      // Processar baseado no tipo de ação
      switch (pendingAction.type) {
        case 'duplicate_event':
          // Mostrar toast informando o usuário
          toast({
            title: "Sessão renovada",
            description: "Sua sessão foi renovada. Você pode tentar duplicar o evento novamente.",
          });
          
          // Redirecionar de volta para a página de eventos
          router.push('/app/organizador/eventos');
          break;
          
        // Caso outros tipos de ações sejam adicionados no futuro
        default:
          console.log('Tipo de ação pendente desconhecido:', pendingAction.type);
      }
    } catch (error) {
      console.error('Erro ao processar ação pendente:', error);
      sessionStorage.removeItem('pendingAction');
    }
  }, [router, toast]);
} 