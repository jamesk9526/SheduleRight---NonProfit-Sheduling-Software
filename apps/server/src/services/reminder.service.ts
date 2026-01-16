import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

export const ReminderSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  leadTimeHours: z.number().int().min(1).max(72).default(24),
  template: z.string().min(1).default('Hello {{name}}, your appointment is scheduled for {{date}} at {{time}}.'),
})

export type ReminderSettings = z.infer<typeof ReminderSettingsSchema> & {
  _id: string
  type: 'reminderSettings'
  orgId: string
  createdAt: string
  updatedAt: string
}

const DEFAULT_TEMPLATE = 'Hello {{name}}, your appointment is scheduled for {{date}} at {{time}}.'

export function createReminderService(dbAdapter: DbAdapter) {
  return {
    async getSettings(orgId: string): Promise<ReminderSettings> {
      const result = await dbAdapter.find({
        selector: { type: 'reminderSettings', orgId },
        limit: 1,
      })

      if (result.docs.length > 0) {
        return result.docs[0] as ReminderSettings
      }

      const now = new Date().toISOString()
      return {
        _id: `reminderSettings:${orgId}`,
        type: 'reminderSettings',
        orgId,
        enabled: false,
        leadTimeHours: 24,
        template: DEFAULT_TEMPLATE,
        createdAt: now,
        updatedAt: now,
      }
    },

    async updateSettings(orgId: string, input: z.infer<typeof ReminderSettingsSchema>): Promise<ReminderSettings> {
      const existing = await this.getSettings(orgId)
      const parsed = ReminderSettingsSchema.parse(input)
      const now = new Date().toISOString()

      const updated: ReminderSettings = {
        ...existing,
        ...parsed,
        updatedAt: now,
      }

      await dbAdapter.insert(updated)
      return updated
    },
  }
}
