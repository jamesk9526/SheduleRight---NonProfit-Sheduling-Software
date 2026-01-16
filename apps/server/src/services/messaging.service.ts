import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

export const MessageCreateSchema = z.object({
  orgId: z.string().min(1),
  bookingId: z.string().min(1),
  siteId: z.string().optional(),
  senderId: z.string().min(1),
  senderRole: z.string().min(1),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid E.164 phone number format'),
  message: z.string().min(1).max(160, 'Message must be 160 characters or less'),
  status: z.string().min(1),
  twilioMessageId: z.string().optional(),
  errorMessage: z.string().optional(),
})

export type MessageRecord = z.infer<typeof MessageCreateSchema> & {
  _id: string
  id: string
  type: 'message'
  slotId: string
  timestamp: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  deliveredAt?: string
}

export function createMessagingService(dbAdapter: DbAdapter) {
  return {
    async listMessages(orgId: string, bookingId: string): Promise<MessageRecord[]> {
      const result = await dbAdapter.find({
        selector: {
          type: 'message',
          orgId,
          bookingId,
        },
        sort: [{ timestamp: 'asc' }],
        limit: 500,
      })

      return result.docs as MessageRecord[]
    },

    async createMessage(input: z.infer<typeof MessageCreateSchema>): Promise<MessageRecord> {
      const parsed = MessageCreateSchema.parse(input)
      const now = new Date().toISOString()
      const messageId = parsed.twilioMessageId ? `message:${parsed.twilioMessageId}` : `message:${randomUUID()}`

      const doc: MessageRecord = {
        _id: messageId,
        id: messageId,
        type: 'message',
        orgId: parsed.orgId,
        siteId: parsed.siteId,
        bookingId: parsed.bookingId,
        slotId: parsed.bookingId,
        senderId: parsed.senderId,
        senderRole: parsed.senderRole,
        phoneNumber: parsed.phoneNumber,
        message: parsed.message,
        status: parsed.status,
        twilioMessageId: parsed.twilioMessageId,
        errorMessage: parsed.errorMessage,
        timestamp: now,
        createdAt: now,
        updatedAt: now,
        sentAt: now,
      }

      await dbAdapter.insert(doc)
      return doc
    },

    async updateStatusByTwilioSid(
      twilioMessageId: string,
      status: string,
      errorMessage?: string
    ): Promise<MessageRecord | null> {
      const messageId = `message:${twilioMessageId}`

      try {
        const existing = await dbAdapter.get(messageId)
        const now = new Date().toISOString()

        const updated: MessageRecord = {
          ...existing,
          status,
          errorMessage: errorMessage || existing.errorMessage,
          deliveredAt: ['delivered', 'read'].includes(status) ? now : existing.deliveredAt,
          updatedAt: now,
        }

        await dbAdapter.insert(updated)
        return updated
      } catch (error) {
        return null
      }
    },
  }
}
