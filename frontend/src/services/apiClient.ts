import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

/**
 * Cliente HTTP configurado con seguridad
 * Implementa interceptores para autenticación y manejo de errores
 */

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/v1',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Incluir cookies (refresh token)
    });

    this.setupInterceptors();
  }

  /**
   * Configurar interceptores de peticiones y respuestas
   */
  private setupInterceptors(): void {
    // Interceptor de peticiones: agregar token de autenticación
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Interceptor de respuestas: manejar errores y refresh de token
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Si el error es 401 y no hemos intentado refrescar el token
        if (error.response?.status === 401 && !originalRequest._retry && this.accessToken) {
          originalRequest._retry = true;

          try {
            // Intentar refrescar el token
            const response = await this.client.post('/auth/refresh');
            const { accessToken } = response.data.data;

            this.setAccessToken(accessToken);

            // Reintentar la petición original con el nuevo token
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Si falla el refresh, limpiar tokens pero NO redirigir automáticamente
            this.clearTokens();
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Establecer access token
   */
  public setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem('accessToken', token);
  }

  /**
   * Obtener access token almacenado
   */
  public getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('accessToken');
    }
    return this.accessToken;
  }

  /**
   * Limpiar tokens
   */
  public clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem('accessToken');
  }

  /**
   * Métodos HTTP
   */
  public async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  public isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();
export default apiClient;
