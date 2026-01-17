import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

/**
 * Notification Preferences Schema
 * Controls what types of notifications a user receives
 */
export const NotificationPreferencesSchema = z.object({
  bookingConfirmation: z.boolean().default(true),
  bookingReminder: z.boolean().default(true),
  bookingCancellation: z.boolean().default(true),
  bookingUpdate: z.boolean().default(true),
  smsReminder: z.boolean().default(true),
  emailReminder: z.boolean().default(false),
  staffNotifications: z.boolean().default(true),
})

export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema> & {
  _id: string
  type: 'notificationPreferences'
  userId: string
  orgId: string
  createdAt: string
  updatedAt: string
}

export function createNotificationService(dbAdapter: DbAdapter) {
  return {
    /**
     * Get user's notification preferences
     * Returns defaults if no preferences exist
     */
    async getPreferences(userId: string, orgId: string): Promise<NotificationPreferences> {
      try {
        const result = await dbAdapter.find({
          selector: {
            type: 'notificationPreferences',
            userId,
            orgId,
          },
          limit: 1,
        })

        if (result.docs.length > 0) {
          return result.docs[0] as NotificationPreferences
        }
      } catch (error) {
        // Continue with defaults on error
      }

      const now = new Date().toISOString()
      return {
        _id: `notificationPreferences:${userId}:${orgId}`,
        type: 'notificationPreferences',
        userId,
        orgId,
        bookingConfirmation: true,
        bookingReminder: true,
        bookingCancellation: true,
        bookingUpdate: true,
        smsReminder: true,
        emailReminder: false,
        staffNotifications: true,
        createdAt: now,
        updatedAt: now,
      }
    },

    /**
     * Update user's notification preferences
     */
    async updatePreferences(
      userId: string,
      orgId: string,
      input: z.infer<typeof NotificationPreferencesSchema>
    ): Promise<NotificationPreferences> {
      const existing = await this.getPreferences(userId, orgId)
      const parsed = NotificationPreferencesSchema.parse(input)
      const now = new Date().toISOString()

      const updated: NotificationPreferences = {
        ...existing,
        ...parsed,
        updatedAt: now,
      }

      await dbAdapter.insert(updated)
      return updated
    },

    /**
     * Check if a user should receive a specific notification type
     */
    async shouldNotify(
      userId: string,
      orgId: string,
      notificationType:
        | 'bookingConfirmation'
        | 'bookingReminder'
        | 'bookingCancellation'
        | 'bookingUpdate'
        | 'smsReminder'
        | 'emailReminder'
        | 'staffNotifications'
    ): Promise<boolean> {
      const prefs = await this.getPreferences(userId, orgId)
      return prefs[notificationType] || false
    },
  }
}
