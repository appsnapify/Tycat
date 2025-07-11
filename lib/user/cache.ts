import type { UserProfile } from './auth'

/**
 * CACHE DE SESSÃO OTIMIZADO PARA SISTEMA USER
 * 
 * Características:
 * - Performance < 50ms
 * - Auto-invalidação
 * - Backup em localStorage
 * - Zero dependências
 */

// ✅ Configuração do cache
const CACHE_EXPIRY = 30 * 60 * 1000 // 30 minutos
const STORAGE_PREFIX = 'user-cache-'
const USER_CACHE_KEY = `${STORAGE_PREFIX}user`
const EVENTS_CACHE_KEY = `${STORAGE_PREFIX}events`

interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
}

interface UserCache {
  user?: CacheEntry<UserProfile>
  events?: CacheEntry<any[]>
}

/**
 * Cache de utilizador
 */
class UserSessionCache {
  private cache: UserCache = {}

  /**
   * Salvar utilizador no cache
   */
  setUser(user: UserProfile): void {
    const entry: CacheEntry<UserProfile> = {
      data: user,
      timestamp: Date.now(),
      expires: Date.now() + CACHE_EXPIRY
    }

    this.cache.user = entry

    // Backup em localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(USER_CACHE_KEY, JSON.stringify(entry))
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao salvar no localStorage:', error)
      }
    }
  }

  /**
   * Obter utilizador do cache
   */
  getUser(): UserProfile | null {
    // 1. Tentar cache em memória primeiro
    if (this.cache.user && this.isValid(this.cache.user)) {
      return this.cache.user.data
    }

    // 2. Tentar localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(USER_CACHE_KEY)
        if (stored) {
          const entry: CacheEntry<UserProfile> = JSON.parse(stored)
          if (this.isValid(entry)) {
            this.cache.user = entry
            return entry.data
          } else {
            // Cache expirado, limpar
            localStorage.removeItem(USER_CACHE_KEY)
          }
        }
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao ler localStorage:', error)
        this.clearUser()
      }
    }

    return null
  }

  /**
   * Verificar se utilizador está em cache e válido
   */
  isUserValid(): boolean {
    const user = this.getUser()
    return !!user
  }

  /**
   * Limpar cache do utilizador
   */
  clearUser(): void {
    delete this.cache.user

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(USER_CACHE_KEY)
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao limpar localStorage:', error)
      }
    }
  }

  /**
   * Salvar eventos no cache
   */
  setEvents(events: any[]): void {
    const entry: CacheEntry<any[]> = {
      data: events,
      timestamp: Date.now(),
      expires: Date.now() + (5 * 60 * 1000) // 5 minutos para eventos
    }

    this.cache.events = entry

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(entry))
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao salvar eventos:', error)
      }
    }
  }

  /**
   * Obter eventos do cache
   */
  getEvents(): any[] | null {
    // 1. Cache em memória
    if (this.cache.events && this.isValid(this.cache.events)) {
      return this.cache.events.data
    }

    // 2. localStorage
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(EVENTS_CACHE_KEY)
        if (stored) {
          const entry: CacheEntry<any[]> = JSON.parse(stored)
          if (this.isValid(entry)) {
            this.cache.events = entry
            return entry.data
          } else {
            localStorage.removeItem(EVENTS_CACHE_KEY)
          }
        }
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao ler eventos:', error)
      }
    }

    return null
  }

  /**
   * Limpar cache de eventos
   */
  clearEvents(): void {
    delete this.cache.events

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(EVENTS_CACHE_KEY)
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao limpar eventos:', error)
      }
    }
  }

  /**
   * Limpar todo o cache
   */
  clear(): void {
    this.cache = {}

    if (typeof window !== 'undefined') {
      try {
        // Limpar todas as chaves do sistema user
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(STORAGE_PREFIX)) {
            localStorage.removeItem(key)
          }
        })
      } catch (error) {
        console.warn('⚠️ [USER-CACHE] Erro ao limpar cache completo:', error)
      }
    }
  }

  /**
   * Verificar se entrada é válida
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expires
  }

  /**
   * Obter estatísticas do cache
   */
  getStats(): { userCached: boolean, eventsCached: boolean, userAge?: number, eventsAge?: number } {
    const stats = {
      userCached: false,
      eventsCached: false,
      userAge: undefined as number | undefined,
      eventsAge: undefined as number | undefined
    }

    if (this.cache.user && this.isValid(this.cache.user)) {
      stats.userCached = true
      stats.userAge = Date.now() - this.cache.user.timestamp
    }

    if (this.cache.events && this.isValid(this.cache.events)) {
      stats.eventsCached = true
      stats.eventsAge = Date.now() - this.cache.events.timestamp
    }

    return stats
  }
}

// ✅ Instância singleton do cache
export const userSessionCache = new UserSessionCache()

// ✅ Funções utilitárias
export const clearAllUserCache = () => {
  userSessionCache.clear()
}

export const getCacheStats = () => {
  return userSessionCache.getStats()
} 