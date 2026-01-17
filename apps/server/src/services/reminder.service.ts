import { z } from 'zod'
import twilio from 'twilio'
import type { DbAdapter } from '../db/adapter.js'
import { config } from '../config.js'
import type { Booking } from './booking.service.js'

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

export function createReminderService(dbAdapter: DbAdapter, notificationService?: any) {
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

    async runReminderSweep() {
      if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
        return { sent: 0, skipped: 0, reason: 'twilio_not_configured' }
      }

      const twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken)
      const now = new Date()
      const maxLeadHours = 72

      const windowStart = now
      const windowEnd = new Date(now.getTime() + maxLeadHours * 60 * 60 * 1000)

      const result = await dbAdapter.find({
        selector: {
          type: 'booking',
          timestamp: {
            $gte: windowStart.toISOString(),
            $lte: windowEnd.toISOString(),
          },
          status: { $in: ['confirmed', 'pending'] },
        },
        limit: 2000,
      })

      const bookings = result.docs as Booking[]
      let sent = 0
      let skipped = 0

      for (const booking of bookings) {
        if (!booking.clientPhone || booking.reminderSentAt) {
          skipped += 1
          continue
        }

        const settings = await this.getSettings(booking.orgId)
        if (!settings.enabled) {
          skipped += 1
          continue
        }

        // Check if client has enabled SMS reminders in their notification preferences
        if (notificationService && booking.clientId) {
          const shouldSend = await notificationService.shouldNotify(
            booking.clientId,
            booking.orgId,
            'smsReminder'
          )
          if (!shouldSend) {
            skipped += 1
            continue
          }
        }

        const bookingStart = new Date(booking.startTime).getTime()
        const diffHours = (bookingStart - now.getTime()) / (60 * 60 * 1000)
        if (diffHours < settings.leadTimeHours || diffHours >= settings.leadTimeHours + 1) {
          skipped += 1
          continue
        }

        const sendTime = new Date(booking.startTime)
        const localDate = sendTime.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
        const localTime = sendTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })

        const message = settings.template
          .replace('{{name}}', booking.clientName)
          .replace('{{date}}', localDate)
          .replace('{{time}}', localTime)

        try {
          await twilioClient.messages.create({
            body: message,
            from: config.twilioPhoneNumber,
            to: booking.clientPhone,
          })

          const updated: Booking = {
            ...booking,
            reminderSentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          await dbAdapter.insert(updated)
          sent += 1
        } catch (error) {
          skipped += 1
        }
      }

      return { sent, skipped, reason: 'ok' }
    },

    startReminderScheduler(intervalMinutes = 15) {
      const intervalMs = intervalMinutes * 60 * 1000
      const handle = setInterval(() => {
        this.runReminderSweep().catch(() => null)
      }, intervalMs)

      return () => clearInterval(handle)
    },
  }
}
