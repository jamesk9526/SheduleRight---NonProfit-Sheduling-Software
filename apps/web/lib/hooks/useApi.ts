import { useCallback } from 'react'
import { getApiBaseUrl } from '@/lib/apiBase'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
}

interface ApiError {
  message: string
  code?: string
  statusCode?: number
}

/**
 * Custom hook for making API calls
 * Automatically includes auth token from localStorage
 */
export function useApi() {
  const API_BASE_URL = getApiBaseUrl()

  const call = useCallback(async (
    endpoint: string,
    options: ApiOptions = {}
  ): Promise<any> => {
    const accessToken = localStorage.getItem('accessToken')
    
    if (!accessToken) {
      throw {
        message: 'No authentication token found',
        code: 'UNAUTHORIZED',
        statusCode: 401,
      } as ApiError
    }

    const url = `${API_BASE_URL}${endpoint}`
    const method = options.method || 'GET'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      const data = await response.json()

      if (!response.ok) {
        throw {
          message: data.error || 'API request failed',
          code: data.code,
          statusCode: response.status,
        } as ApiError
      }

      return data
    } catch (error) {
      if (error instanceof Response) {
        throw {
          message: 'Network error',
          code: 'NETWORK_ERROR',
          statusCode: 0,
        } as ApiError
      }
      throw error
    }
  }, [API_BASE_URL])

  const get = useCallback((endpoint: string) => call(endpoint, { method: 'GET' }), [call])
  const post = useCallback((endpoint: string, body: any) => call(endpoint, { method: 'POST', body }), [call])
  const put = useCallback((endpoint: string, body: any) => call(endpoint, { method: 'PUT', body }), [call])
  const del = useCallback((endpoint: string) => call(endpoint, { method: 'DELETE' }), [call])
  const patch = useCallback((endpoint: string, body: any) => call(endpoint, { method: 'PATCH', body }), [call])

  return { call, get, post, put, delete: del, patch, API_BASE_URL }
}
