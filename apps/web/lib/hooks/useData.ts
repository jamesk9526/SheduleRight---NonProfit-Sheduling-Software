import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from './useApi'

// Types
export interface Org {
  _id: string
  name: string
  tenantId: string
  settings?: {
    timezone?: string
  }
  createdAt: string
  updatedAt: string
}

export interface Site {
  _id: string
  name: string
  address?: string
  phone?: string
  orgId: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  roles: string[]
  orgId: string
  verified: boolean
  active: boolean
}

/**
 * Hook to fetch current user
 */
export function useCurrentUser() {
  const { call } = useApi()

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await call('/api/v1/users/me')
      return response as User
    },
  })
}

/**
 * Hook to fetch all organizations (admin only)
 */
export function useOrganizations() {
  const { call } = useApi()

  return useQuery({
    queryKey: ['orgs'],
    queryFn: async () => {
      const response = await call('/api/v1/orgs')
      return response.data as Org[]
    },
  })
}

/**
 * Hook to fetch single organization
 */
export function useOrganization(orgId: string | null) {
  const { call } = useApi()

  return useQuery({
    queryKey: ['org', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      const response = await call(`/api/v1/orgs/${orgId}`)
      return response as Org
    },
    enabled: !!orgId,
  })
}

/**
 * Hook to fetch sites for an organization
 */
export function useSites(orgId: string | null) {
  const { call } = useApi()

  return useQuery({
    queryKey: ['sites', orgId],
    queryFn: async () => {
      if (!orgId) throw new Error('Organization ID is required')
      const response = await call(`/api/v1/orgs/${orgId}/sites`)
      return response.data as Site[]
    },
    enabled: !!orgId,
  })
}

/**
 * Hook to create a new organization
 */
export function useCreateOrganization() {
  const { call } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; timezone?: string }) => {
      return await call('/api/v1/orgs', {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
    },
  })
}

/**
 * Hook to create a new site
 */
export function useCreateSite(orgId: string | null) {
  const { call } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; address?: string; phone?: string }) => {
      if (!orgId) throw new Error('Organization ID is required')
      return await call(`/api/v1/orgs/${orgId}/sites`, {
        method: 'POST',
        body: data,
      })
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['sites', orgId] })
      }
    },
  })
}
