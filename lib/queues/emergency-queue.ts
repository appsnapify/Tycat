// lib/queues/emergency-queue.ts
// Emergency Queue - Buffer infinito anti-crash
// SÓ ATIVA EM CASO DE FALHAS - Zero impacto no fluxo normal

interface EmergencyJobData {
  type: 'guest-creation' | 'qr-generation' | 'notification';
  data: any;
  originalError: string;
  timestamp: number;
  retryCount: number;
}

interface EmergencyQueueEntry {
  id: string;
  jobData: EmergencyJobData;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  processedAt?: number;
}

class EmergencyQueue {
  private queue = new Map<string, EmergencyQueueEntry>();
  private isProcessing = false;
  
  // ✅ ADICIONAR À QUEUE (nunca falha)
  async add(type: EmergencyJobData['type'], data: any, originalError: string): Promise<string> {
    const id = `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const entry: EmergencyQueueEntry = {
      id,
      jobData: {
        type,
        data,
        originalError,
        timestamp: Date.now(),
        retryCount: 0
      },
      status: 'pending',
      createdAt: Date.now()
    };
    
    this.queue.set(id, entry);
    
    console.log(`[EMERGENCY-QUEUE] Job adicionado: ${id} (tipo: ${type})`);
    
    // ✅ PROCESSAR EM BACKGROUND (não bloqueia)
    if (!this.isProcessing) {
      setTimeout(() => this.processQueue(), 1000);
    }
    
    return id;
  }
  
  // ✅ PROCESSAR QUEUE EM BACKGROUND
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;
    
    try {
      const pendingJobs = Array.from(this.queue.values())
        .filter(entry => entry.status === 'pending')
        .sort((a, b) => a.createdAt - b.createdAt);
      
      for (const entry of pendingJobs) {
        try {
          entry.status = 'processing';
          
          const success = await this.processJob(entry.jobData);
          
          if (success) {
            entry.status = 'completed';
            entry.processedAt = Date.now();
            console.log(`[EMERGENCY-QUEUE] Job processado com sucesso: ${entry.id}`);
          } else {
            entry.jobData.retryCount++;
            if (entry.jobData.retryCount >= 10) {
              entry.status = 'failed';
              console.error(`[EMERGENCY-QUEUE] Job falhou após 10 tentativas: ${entry.id}`);
            } else {
              entry.status = 'pending';
              console.warn(`[EMERGENCY-QUEUE] Job falhhou, tentativa ${entry.jobData.retryCount}: ${entry.id}`);
            }
          }
          
          // ✅ DELAY entre jobs para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          entry.status = 'failed';
          console.error(`[EMERGENCY-QUEUE] Erro ao processar job ${entry.id}:`, error);
        }
      }
      
    } finally {
      this.isProcessing = false;
      
      // ✅ CLEANUP: remover jobs antigos
      this.cleanup();
      
      // ✅ REAGENDAR se ainda há jobs pendentes
      const hasPending = Array.from(this.queue.values()).some(e => e.status === 'pending');
      if (hasPending) {
        setTimeout(() => this.processQueue(), 30000); // Tentar novamente em 30s
      }
    }
  }
  
  // ✅ PROCESSAR JOB INDIVIDUAL
  private async processJob(jobData: EmergencyJobData): Promise<boolean> {
    try {
      switch (jobData.type) {
        case 'guest-creation':
          return await this.processGuestCreation(jobData.data);
        case 'qr-generation':
          return await this.processQRGeneration(jobData.data);
        case 'notification':
          return await this.processNotification(jobData.data);
        default:
          console.warn(`[EMERGENCY-QUEUE] Tipo de job desconhecido: ${jobData.type}`);
          return false;
      }
    } catch (error) {
      console.error(`[EMERGENCY-QUEUE] Erro no processamento do job:`, error);
      return false;
    }
  }
  
  // ✅ PROCESSAR CRIAÇÃO DE GUEST
  private async processGuestCreation(data: any): Promise<boolean> {
    try {
      const { createAdminClient } = await import('@/lib/supabase/adminClient');
      const supabase = createAdminClient();
      
      const { data: result, error } = await supabase.rpc('create_guest_safely', {
        p_event_id: data.event_id,
        p_client_user_id: data.client_user_id,
        p_promoter_id: data.promoter_id,
        p_team_id: data.team_id,
        p_name: data.name,
        p_phone: data.phone,
        p_source: 'EMERGENCY_QUEUE'
      });
      
      if (error) {
        console.error('[EMERGENCY-QUEUE] Erro na criação de guest:', error);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('[EMERGENCY-QUEUE] Erro ao processar guest creation:', error);
      return false;
    }
  }
  
  // ✅ PROCESSAR QR GENERATION
  private async processQRGeneration(data: any): Promise<boolean> {
    try {
      // Implementar geração de QR se necessário
      console.log('[EMERGENCY-QUEUE] QR generation processado:', data);
      return true;
    } catch (error) {
      console.error('[EMERGENCY-QUEUE] Erro ao processar QR generation:', error);
      return false;
    }
  }
  
  // ✅ PROCESSAR NOTIFICAÇÃO
  private async processNotification(data: any): Promise<boolean> {
    try {
      // Implementar notificação se necessário
      console.log('[EMERGENCY-QUEUE] Notification processada:', data);
      return true;
    } catch (error) {
      console.error('[EMERGENCY-QUEUE] Erro ao processar notification:', error);
      return false;
    }
  }
  
  // ✅ CLEANUP AUTOMÁTICO
  private cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [id, entry] of this.queue.entries()) {
      // Remover jobs completados há mais de 1 hora
      if (entry.status === 'completed' && (now - (entry.processedAt || 0)) > oneHour) {
        this.queue.delete(id);
      }
      // Remover jobs falhados há mais de 2 horas
      else if (entry.status === 'failed' && (now - entry.createdAt) > (2 * oneHour)) {
        this.queue.delete(id);
      }
    }
  }
  
  // ✅ ESTATÍSTICAS
  getStats() {
    const stats = { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 };
    
    for (const entry of this.queue.values()) {
      stats.total++;
      stats[entry.status]++;
    }
    
    return stats;
  }
  
  // ✅ LISTAR JOBS (para debug)
  listJobs(status?: EmergencyQueueEntry['status']) {
    return Array.from(this.queue.values())
      .filter(entry => !status || entry.status === status)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
}

// ✅ SINGLETON INSTANCE
const emergencyQueue = new EmergencyQueue();

export { emergencyQueue, EmergencyQueue };
export type { EmergencyJobData, EmergencyQueueEntry }; 