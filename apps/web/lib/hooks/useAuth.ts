'use client'

import { useState, useEffect } from 'react'

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
  orgId: string
  verified: boolean
  active: boolean
}

export interface UseAuthReturn {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
}

/**
 * Hook to get current authenticated user from localStorage and session
 * 
 * This hook retrieves the user data that was stored during login
 * and provides authentication status
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check if we have a token and user in localStorage
    const accessToken = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')

    if (accessToken && userStr) {
      try {
        const userData = JSON.parse(userStr) as AuthUser
        setUser(userData)
      } catch (error) {
        console.error('Failed to parse stored user data:', error)
        setUser(null)
      }
    }

    setIsLoading(false)
  }, [])

  const logout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
  }
}
