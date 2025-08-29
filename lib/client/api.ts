import { ClientApiResponse } from '@/types/client';

class ClientAPI {
  private baseURL: string;
  private defaultHeaders: HeadersInit;

  constructor() {
    this.baseURL = '/api/client';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // ✅ COMPLEXIDADE: 3 pontos (1 base + 1 if + 1 ?)
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('client_access_token');
    return token ? 
      { ...this.defaultHeaders, Authorization: `Bearer ${token}` } : 
      this.defaultHeaders;
  }

  // ✅ COMPLEXIDADE: 6 pontos (1 base + 1 try + 1 if + 1 && + 1 ! + 1 ?.)
  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ClientApiResponse<T>> {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      // ✅ SEGURANÇA: Verificar Content-Type antes de fazer parse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) { // +1
        return {
          success: false,
          error: 'Resposta inválida do servidor',
          code: 'INVALID_RESPONSE'
        };
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          code: data.code
        };
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: 'Erro de conexão. Verifique sua internet.',
        code: 'NETWORK_ERROR'
      };
    }
  }

  // ✅ COMPLEXIDADE: 1 ponto (apenas delegação)
  async get<T = any>(endpoint: string): Promise<ClientApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // ✅ COMPLEXIDADE: 2 pontos (1 base + 1 ?)
  async post<T = any>(endpoint: string, data?: any): Promise<ClientApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ✅ COMPLEXIDADE: 2 pontos (1 base + 1 ?)
  async put<T = any>(endpoint: string, data?: any): Promise<ClientApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // ✅ COMPLEXIDADE: 1 ponto (apenas delegação)
  async delete<T = any>(endpoint: string): Promise<ClientApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // ✅ COMPLEXIDADE: 2 pontos (1 base + 1 ?)
  async patch<T = any>(endpoint: string, data?: any): Promise<ClientApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Instância singleton
export const clientApi = new ClientAPI();

// Utility functions para endpoints específicos
export const clientAuthApi = {
  login: (data: any) => clientApi.post('/auth/login', data),
  register: (data: any) => clientApi.post('/auth/register', data),
  logout: () => clientApi.post('/auth/logout'),
  refresh: (data: any) => clientApi.post('/auth/refresh', data),
  checkPhone: (phone: string) => clientApi.post('/auth/check-phone', { phone }),
};

export const clientProfileApi = {
  get: () => clientApi.get('/profile'),
  update: (data: any) => clientApi.put('/profile', data),
  changePassword: (data: any) => clientApi.put('/profile/password', data),
};

export const clientEventsApi = {
  getAll: () => clientApi.get('/events'),
  getUpcoming: (limit?: number) => clientApi.get(`/events/upcoming${limit ? `?limit=${limit}` : ''}`),
  getPast: (page?: number, limit?: number) => {
    const params = new URLSearchParams();
    if (page) params.set('page', page.toString());
    if (limit) params.set('limit', limit.toString());
    return clientApi.get(`/events/past${params.toString() ? `?${params.toString()}` : ''}`);
  },
  getById: (id: string) => clientApi.get(`/events/${id}`),
  getStats: () => clientApi.get('/events/stats'),
};

export const clientQRApi = {
  generate: (eventId: string) => clientApi.post('/qr/generate', { eventId }),
  validate: (qrCode: string) => clientApi.post('/qr/validate', { qrCode }),
};

