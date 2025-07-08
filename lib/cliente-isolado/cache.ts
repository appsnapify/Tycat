/**
 * SISTEMA DE CACHE ISOLADO PARA CLIENTE
 * 
 * Características:
 * - Zero dependências de outros sistemas
 * - Memory cache + localStorage
 * - Smart invalidation
 * - Performance otimizada
 */

import type { ClienteUser } from './auth'

// ✅ Tipos para o sistema de cache
export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiresAt: number
  version: string
}

export interface SessionCache {
  user: ClienteUser
  lastCheck: number
  expiresAt: number
}

export interface EventsCache {
  events: any[]
  lastFetch: number
  userId: string
}

// ✅ Configurações de cache
const CACHE_CONFIG = {
  SESSION_TTL: 30 * 60 * 1000, // 30 minutos
  EVENTS_TTL: 5 * 60 * 1000,   // 5 minutos
  MEMORY_TTL: 2 * 60 * 1000,   // 2 minutos (cache em memória)
  VERSION: 'v1.0',
  PREFIX: 'cliente-isolado'
}

// ✅ Memory cache (mais rápido que localStorage)
const memoryCache = new Map<string, CacheEntry<any>>()

/**
 * Utilitários base para cache
 */
const createCacheKey = (key: string): string => {
  return `${CACHE_CONFIG.PREFIX}-${key}`
}

const isExpired = (entry: CacheEntry<any>): boolean => {
  return Date.now() > entry.expiresAt
}

const createCacheEntry = <T>(data: T, ttl: number): CacheEntry<T> => {
  return {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
    version: CACHE_CONFIG.VERSION
  }
}

/**
 * Storage abstraction (memoria + localStorage)
 */
const storage = {
  set: <T>(key: string, data: T, ttl: number): void => {
    const cacheKey = createCacheKey(key)
    const entry = createCacheEntry(data, ttl)
    
    // ✅ Cache em memória (super rápido)
    memoryCache.set(cacheKey, entry)
    
    // ✅ Cache em localStorage (persistente)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(entry))
      } catch (error) {
        console.warn('Cache localStorage warning:', error)
      }
    }
  },

  get: <T>(key: string): T | null => {
    const cacheKey = createCacheKey(key)
    
    // ✅ Tentar memory cache primeiro (mais rápido)
    const memoryEntry = memoryCache.get(cacheKey)
    if (memoryEntry && !isExpired(memoryEntry)) {
      return memoryEntry.data as T
    }
    
    // ✅ Fallback para localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(cacheKey)
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored)
          
          // Verificar se não expirou
          if (!isExpired(entry)) {
            // Repovoar memory cache
            memoryCache.set(cacheKey, entry)
            return entry.data
          } else {
            // Limpar entrada expirada
            localStorage.removeItem(cacheKey)
          }
        }
      } catch (error) {
        console.warn('Cache localStorage read warning:', error)
      }
    }
    
    return null
  },

  remove: (key: string): void => {
    const cacheKey = createCacheKey(key)
    memoryCache.delete(cacheKey)
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(cacheKey)
    }
  },

  clear: (): void => {
    memoryCache.clear()
    
    if (typeof window !== 'undefined') {
      // Limpar só as chaves do sistema isolado
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    }
  }
}

/**
 * Cache de sessão do utilizador
 */
export const sessionCache = {
  set: (user: ClienteUser): void => {
    const session: SessionCache = {
      user,
      lastCheck: Date.now(),
      expiresAt: Date.now() + CACHE_CONFIG.SESSION_TTL
    }
    storage.set('session', session, CACHE_CONFIG.SESSION_TTL)
  },

  get: (): ClienteUser | null => {
    const session = storage.get<SessionCache>('session')
    return session?.user || null
  },

  isValid: (): boolean => {
    const session = storage.get<SessionCache>('session')
    return !!session && session.expiresAt > Date.now()
  },

  refresh: (user: ClienteUser): void => {
    sessionCache.set(user)
  },

  clear: (): void => {
    storage.remove('session')
  }
}

/**
 * Cache de eventos do utilizador
 */
export const eventsCache = {
  set: (userId: string, events: any[]): void => {
    const eventsData: EventsCache = {
      events,
      lastFetch: Date.now(),
      userId
    }
    storage.set(`events-${userId}`, eventsData, CACHE_CONFIG.EVENTS_TTL)
  },

  get: (userId: string): any[] | null => {
    const eventsData = storage.get<EventsCache>(`events-${userId}`)
    
    // Verificar se é para o utilizador correto
    if (eventsData && eventsData.userId === userId) {
      return eventsData.events
    }
    
    return null
  },

  isValid: (userId: string): boolean => {
    const eventsData = storage.get<EventsCache>(`events-${userId}`)
    return !!eventsData && eventsData.userId === userId
  },

  invalidate: (userId: string): void => {
    storage.remove(`events-${userId}`)
  },

  getLastFetch: (userId: string): number => {
    const eventsData = storage.get<EventsCache>(`events-${userId}`)
    return eventsData?.lastFetch || 0
  }
}

/**
 * Cache genérico para outros dados
 */
export const dataCache = {
  set: <T>(key: string, data: T, ttl: number = CACHE_CONFIG.MEMORY_TTL): void => {
    storage.set(`data-${key}`, data, ttl)
  },

  get: <T>(key: string): T | null => {
    return storage.get<T>(`data-${key}`)
  },

  remove: (key: string): void => {
    storage.remove(`data-${key}`)
  }
}

/**
 * Utilitários de manutenção do cache
 */
export const cacheUtils = {
  // Limpar cache expirado
  cleanup: (): void => {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.PREFIX)) {
          try {
            const stored = localStorage.getItem(key)
            if (stored) {
              const entry = JSON.parse(stored)
              if (isExpired(entry)) {
                localStorage.removeItem(key)
              }
            }
          } catch (error) {
            // Remove entradas corrompidas
            localStorage.removeItem(key)
          }
        }
      })
    }
  },

  // Obter estatísticas do cache
  getStats: () => {
    const stats = {
      memoryEntries: memoryCache.size,
      localStorageEntries: 0,
      totalSize: 0
    }

    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.PREFIX)) {
          stats.localStorageEntries++
          const item = localStorage.getItem(key)
          if (item) {
            stats.totalSize += item.length
          }
        }
      })
    }

    return stats
  },

  // Limpar todo o cache
  clearAll: (): void => {
    storage.clear()
  },

  // Verificar integridade do cache
  validate: (): boolean => {
    try {
      // Teste básico de escrita/leitura
      const testKey = 'test'
      const testData = { test: true, timestamp: Date.now() }
      
      storage.set(testKey, testData, 1000)
      const retrieved = storage.get(testKey)
      storage.remove(testKey)
      
      return retrieved !== null
    } catch {
      return false
    }
  }
}

/**
 * Hook de inicialização do cache
 */
export const initializeCache = (): void => {
  // Limpar cache expirado na inicialização
  cacheUtils.cleanup()
  
  // Log estatísticas em development
  if (process.env.NODE_ENV === 'development') {
    const stats = cacheUtils.getStats()
    console.log('🔥 [CLIENTE-ISOLADO-CACHE] Initialized:', stats)
  }
}

/**
 * Invalidação inteligente baseada em eventos
 */
export const invalidateUserData = (userId: string): void => {
  eventsCache.invalidate(userId)
  // Pode adicionar outros caches relacionados ao utilizador aqui
}

/**
 * Performance monitoring
 */
export const cachePerformance = {
  logHit: (key: string): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [CACHE-HIT] ${key}`)
    }
  },

  logMiss: (key: string): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`❌ [CACHE-MISS] ${key}`)
    }
  },

  logSet: (key: string, ttl: number): void => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`💾 [CACHE-SET] ${key} (TTL: ${ttl}ms)`)
    }
  }
} 