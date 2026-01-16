import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'
import { hashPassword } from './auth.service.js'

const BOOTSTRAP_DOC_ID = 'system:bootstrap'
const CONFIG_DOC_ID = 'system:config'

export const BootstrapSchema = z.object({
  orgName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  adminName: z.string().min(1),
})

export function createBootstrapService(dbAdapter: DbAdapter) {
  let cachedBootstrapped: boolean | null = null

  return {
    async isBootstrapped(): Promise<boolean> {
      if (cachedBootstrapped !== null) return cachedBootstrapped
      try {
        const doc = await dbAdapter.get(BOOTSTRAP_DOC_ID)
        cachedBootstrapped = !!doc?.completed
        return cachedBootstrapped
      } catch (error: any) {
        if (error?.statusCode === 404) {
          cachedBootstrapped = false
          return false
        }
        throw error
      }
    },

    async assertNotBootstrapped() {
      const done = await this.isBootstrapped()
      if (done) {
        const err = new Error('System already bootstrapped') as Error & { statusCode?: number }
        err.statusCode = 409
        throw err
      }
    },

    async markBootstrapped(meta: { orgId: string; adminUserId: string }) {
      const now = new Date().toISOString()
      await dbAdapter.insert({
        _id: BOOTSTRAP_DOC_ID,
        type: 'system',
        completed: true,
        orgId: meta.orgId,
        adminUserId: meta.adminUserId,
        createdAt: now,
        updatedAt: now,
      })
      cachedBootstrapped = true
    },

    async ensureConfigDefaults() {
      try {
        await dbAdapter.get(CONFIG_DOC_ID)
        return
      } catch (error: any) {
        if (error?.statusCode !== 404) throw error
      }

      const now = new Date().toISOString()
      await dbAdapter.insert({
        _id: CONFIG_DOC_ID,
        type: 'system:config',
        defaults: {
          timezone: 'UTC',
          bookingLeadTimeMinutes: 0,
        },
        createdAt: now,
        updatedAt: now,
      })
    },

    async bootstrap(payload: z.infer<typeof BootstrapSchema>) {
      await this.assertNotBootstrapped()
      const now = new Date().toISOString()
      const orgId = `org-${randomUUID()}`
      const userId = `user-${randomUUID()}`

      const orgDoc = {
        _id: orgId,
        type: 'org',
        id: orgId,
        name: payload.orgName,
        tenantId: orgId,
        settings: { timezone: 'UTC' },
        createdAt: now,
        updatedAt: now,
      }

      const userDoc = {
        _id: userId,
        type: 'user',
        email: payload.adminEmail.toLowerCase(),
        name: payload.adminName,
        passwordHash: hashPassword(payload.adminPassword),
        roles: ['ADMIN'],
        orgId,
        verified: true,
        active: true,
        createdAt: now,
        updatedAt: now,
      }

      await dbAdapter.insert(orgDoc)
      await dbAdapter.insert(userDoc)
      await this.markBootstrapped({ orgId, adminUserId: userId })
      await this.ensureConfigDefaults()

      return { orgId, adminUserId: userId }
    },
  }
}
