import { z } from 'zod'

// Base entity schema
export const BaseEntity = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deleted: z.boolean().default(false),
  deletedAt: z.string().datetime().optional(),
})

// Organization
export const Organization = BaseEntity.extend({
  name: z.string().min(1),
  tenantId: z.string().uuid(),
  settings: z.record(z.unknown()).optional(),
})

export const CreateOrganizationRequest = z.object({
  name: z.string().min(1),
  settings: z.record(z.unknown()).optional(),
})

export type Organization = z.infer<typeof Organization>
export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequest>

// Site
export const Site = BaseEntity.extend({
  orgId: z.string().uuid(),
  name: z.string().min(1),
  address: z.string().optional(),
  timezone: z.string().default('UTC'),
})

export type Site = z.infer<typeof Site>

// User
export const User = BaseEntity.extend({
  orgId: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  roles: z.array(z.enum(['admin', 'scheduler', 'staff', 'volunteer', 'client'])),
  verified: z.boolean().default(false),
  active: z.boolean().default(true),
})

export type User = z.infer<typeof User>

// Resource (room, equipment, etc.)
export const Resource = BaseEntity.extend({
  orgId: z.string().uuid(),
  siteId: z.string().uuid(),
  name: z.string(),
  type: z.enum(['room', 'equipment', 'staff']),
  capacity: z.number().int().positive().optional(),
})

export type Resource = z.infer<typeof Resource>

// Service (appointment type)
export const Service = BaseEntity.extend({
  orgId: z.string().uuid(),
  name: z.string(),
  durationMinutes: z.number().int().positive(),
  preBufferMinutes: z.number().int().default(0),
  postBufferMinutes: z.number().int().default(0),
  active: z.boolean().default(true),
})

export type Service = z.infer<typeof Service>

// Booking
export const Booking = BaseEntity.extend({
  orgId: z.string().uuid(),
  siteId: z.string().uuid(),
  serviceId: z.string().uuid(),
  resourceId: z.string().uuid(),
  clientId: z.string().uuid(),
  startTime: z.string().datetime(),
  durationMinutes: z.number().int().positive(),
  status: z.enum(['pending', 'confirmed', 'canceled', 'noshow', 'completed']).default('pending'),
  notes: z.string().optional(),
})

export const CreateBookingRequest = z.object({
  serviceId: z.string().uuid(),
  resourceId: z.string().uuid(),
  clientId: z.string().uuid(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
})

export type Booking = z.infer<typeof Booking>
export type CreateBookingRequest = z.infer<typeof CreateBookingRequest>

// Auth
export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export const LoginResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: User,
})

export type LoginRequest = z.infer<typeof LoginRequest>
export type LoginResponse = z.infer<typeof LoginResponse>
