import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

export const CreateVolunteerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

export const CreateShiftSchema = z.object({
  title: z.string().min(1),
  siteId: z.string().optional(),
  start: z.string(),
  end: z.string(),
  capacity: z.number().int().min(1).max(500).default(1),
  location: z.string().optional(),
  notes: z.string().optional(),
})

export type Volunteer = z.infer<typeof CreateVolunteerSchema> & {
  _id: string
  type: 'volunteer'
  orgId: string
  createdAt: string
  updatedAt: string
}

export type Shift = z.infer<typeof CreateShiftSchema> & {
  _id: string
  type: 'shift'
  orgId: string
  assignedVolunteerIds: string[]
  status: 'scheduled' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

export function createVolunteerService(dbAdapter: DbAdapter) {
  return {
    async listVolunteers(orgId: string): Promise<Volunteer[]> {
      const result = await dbAdapter.find({
        selector: {
          type: 'volunteer',
          orgId,
        },
      })
      return result.docs as Volunteer[]
    },

    async createVolunteer(orgId: string, input: z.infer<typeof CreateVolunteerSchema>): Promise<Volunteer> {
      const now = new Date().toISOString()
      const doc: Volunteer = {
        _id: `volunteer:${randomUUID()}`,
        type: 'volunteer',
        orgId,
        createdAt: now,
        updatedAt: now,
        ...input,
      }

      await dbAdapter.insert(doc)
      return doc
    },

    async listShifts(orgId: string): Promise<Shift[]> {
      const result = await dbAdapter.find({
        selector: {
          type: 'shift',
          orgId,
        },
      })
      return result.docs as Shift[]
    },

    async createShift(orgId: string, input: z.infer<typeof CreateShiftSchema>): Promise<Shift> {
      const now = new Date().toISOString()
      const doc: Shift = {
        _id: `shift:${randomUUID()}`,
        type: 'shift',
        orgId,
        assignedVolunteerIds: [],
        status: 'scheduled',
        createdAt: now,
        updatedAt: now,
        ...input,
      }

      await dbAdapter.insert(doc)
      return doc
    },

    async assignVolunteers(shiftId: string, orgId: string, volunteerIds: string[]): Promise<Shift> {
      const existing = await dbAdapter.get(shiftId) as Shift

      if (existing.orgId !== orgId) {
        const error = new Error('Shift not found in organization') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }

      const uniqueIds = Array.from(new Set([...(existing.assignedVolunteerIds || []), ...volunteerIds]))
      const updated: Shift = {
        ...existing,
        assignedVolunteerIds: uniqueIds,
        updatedAt: new Date().toISOString(),
      }

      await dbAdapter.insert(updated)
      return updated
    },
  }
}
