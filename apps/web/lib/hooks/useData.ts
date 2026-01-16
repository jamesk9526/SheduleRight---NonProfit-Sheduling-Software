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

export interface Volunteer {
  _id: string
  name: string
  email: string
  phone?: string
  orgId: string
  skills?: string[]
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Shift {
  _id: string
  title: string
  siteId?: string
  orgId: string
  start: string
  end: string
  capacity: number
  location?: string
  notes?: string
  assignedVolunteerIds: string[]
  status: string
  createdAt: string
  updatedAt: string
}

export interface ReminderSettings {
  _id: string
  orgId: string
  enabled: boolean
  leadTimeHours: number
  template: string
  createdAt: string
  updatedAt: string
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

export function useVolunteers() {
  const { call } = useApi()

  return useQuery({
    queryKey: ['volunteers'],
    queryFn: async () => {
      const response = await call('/api/v1/volunteers')
      return response.data as Volunteer[]
    },
  })
}

export function useCreateVolunteer() {
  const { call } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { name: string; email: string; phone?: string; skills?: string[]; notes?: string }) => {
      return await call('/api/v1/volunteers', { method: 'POST', body: payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] })
    },
  })
}

export function useShifts() {
  const { call } = useApi()

  return useQuery({
    queryKey: ['shifts'],
    queryFn: async () => {
      const response = await call('/api/v1/shifts')
      return response.data as Shift[]
    },
  })
}

export function useCreateShift() {
  const { call } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { title: string; start: string; end: string; siteId?: string; capacity?: number; location?: string; notes?: string }) => {
      return await call('/api/v1/shifts', { method: 'POST', body: payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] })
    },
  })
}

export function useReminderSettings() {
  const { call } = useApi()

  return useQuery({
    queryKey: ['reminderSettings'],
    queryFn: async () => {
      const response = await call('/api/v1/reminders/settings')
      return response as ReminderSettings
    },
  })
}

export function useUpdateReminderSettings() {
  const { call } = useApi()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { enabled: boolean; leadTimeHours: number; template: string }) => {
      return await call('/api/v1/reminders/settings', { method: 'PUT', body: payload })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminderSettings'] })
    },
  })
}
