// lib/processing/processing-manager.ts
// Manager simplificado para processamento de guests
// Usando abordagem híbrida para resolver problemas de singleton

interface ProcessingEntry {
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: number;
}

// ✅ STORAGE GLOBAL - Resolve problema de singleton cross-API
const globalStorage = globalThis as any;
if (!globalStorage.__processingMap) {
  globalStorage.__processingMap = new Map<string, ProcessingEntry>();
}

class ProcessingManager {
  private static instance: ProcessingManager;
  
  // ✅ USAR STORAGE GLOBAL EM VEZ DE INSTÂNCIA LOCAL
  private get processingMap(): Map<string, ProcessingEntry> {
    return globalStorage.__processingMap;
  }

  static getInstance(): ProcessingManager {
    if (!ProcessingManager.instance) {
      ProcessingManager.instance = new ProcessingManager();
    }
    return ProcessingManager.instance;
  }

  set(key: string, entry: ProcessingEntry): void {
    this.processingMap.set(key, entry);
    console.log(`[PROCESSING-MANAGER] SET ${key}: ${entry.status} (global map size: ${this.processingMap.size})`);
  }

  get(key: string): ProcessingEntry | undefined {
    const entry = this.processingMap.get(key);
    console.log(`[PROCESSING-MANAGER] GET ${key}: ${entry ? entry.status : 'NOT_FOUND'} (global map size: ${this.processingMap.size})`);
    return entry;
  }

  delete(key: string): boolean {
    const deleted = this.processingMap.delete(key);
    console.log(`[PROCESSING-MANAGER] DELETE ${key}: ${deleted} (global map size: ${this.processingMap.size})`);
    return deleted;
  }

  cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    for (const [key, entry] of this.processingMap.entries()) {
      let shouldRemove = false;
      
      // Entradas 'processing' expiram em 10 minutos
      if (entry.status === 'processing' && now - entry.timestamp > 10 * 60 * 1000) {
        shouldRemove = true;
      }
      
      // Entradas 'completed' ou 'failed' expiram em 5 minutos
      if ((entry.status === 'completed' || entry.status === 'failed') && now - entry.timestamp > 5 * 60 * 1000) {
        shouldRemove = true;
      }
      
      if (shouldRemove) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.processingMap.delete(key);
      console.log(`[PROCESSING-MANAGER] Cleanup removido: ${key}`);
    });
  }

  getStats(): { total: number; processing: number; completed: number; failed: number } {
    const stats = { total: 0, processing: 0, completed: 0, failed: 0 };
    
    for (const entry of this.processingMap.values()) {
      stats.total++;
      stats[entry.status]++;
    }
    
    return stats;
  }

  // ✅ MÉTODO PARA DEBUG
  listAll(): void {
    console.log('[PROCESSING-MANAGER] Todas as entradas:');
    for (const [key, entry] of this.processingMap.entries()) {
      console.log(`  ${key}: ${entry.status} (${Date.now() - entry.timestamp}ms ago)`);
    }
  }
}

// ✅ SINGLETON INSTANCE
const processingManager = ProcessingManager.getInstance();

// ✅ CLEANUP TIMER (a cada 3 minutos)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    processingManager.cleanup();
  }, 3 * 60 * 1000);
}

export { ProcessingManager, processingManager };
export type { ProcessingEntry }; 