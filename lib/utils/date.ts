import { format, isValid, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Formata uma data para exibição
 * @param date Data a ser formatada
 * @param format Formato desejado ('MMM' para mês abreviado, 'd' para dia)
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'Data não definida';
  
  try {
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Tenta converter a string para Date
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }
    
    // Verifica se a data é válida
    if (!isValid(dateObj)) {
      console.error('Data inválida:', date);
      return 'Data inválida';
    }
    
    // Formata a data usando date-fns
    return format(dateObj, 'PPP', { locale: pt });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return 'Data inválida';
  }
} 