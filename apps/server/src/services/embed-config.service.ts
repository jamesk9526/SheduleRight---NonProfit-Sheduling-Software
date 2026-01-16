import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { DbAdapter } from '../db/adapter.js'

export const EmbedConfigSchema = z.object({
  name: z.string().min(1),
  siteId: z.string().min(1),
  themeColor: z.string().optional(),
  buttonLabel: z.string().optional(),
  allowDomains: z.array(z.string()).optional(),
  locale: z.string().optional(),
  timezone: z.string().optional(),
  defaultService: z.string().optional(),
})

export type EmbedConfigInput = z.infer<typeof EmbedConfigSchema>

export type EmbedConfig = EmbedConfigInput & {
  _id: string
  type: 'embed_config'
  orgId: string
  token: string
  status: 'active' | 'archived'
  createdAt: string
  updatedAt: string
}

export function createEmbedConfigService(db: DbAdapter) {
  return {
    async listConfigs(orgId: string): Promise<EmbedConfig[]> {
      const result = await db.find({
        selector: {
          type: 'embed_config',
          orgId,
          status: 'active',
        },
        limit: 1000,
      })
      return result.docs as EmbedConfig[]
    },

    async createConfig(orgId: string, input: EmbedConfigInput): Promise<EmbedConfig> {
      const now = new Date().toISOString()
      const doc: EmbedConfig = {
        _id: `embed_config:${randomUUID()}`,
        type: 'embed_config',
        orgId,
        token: randomUUID().replace(/-/g, ''),
        status: 'active',
        createdAt: now,
        updatedAt: now,
        ...input,
      }

      await db.insert(doc)
      return doc
    },

    async updateConfig(orgId: string, configId: string, input: Partial<EmbedConfigInput>): Promise<EmbedConfig> {
      const existing = await db.get(configId) as EmbedConfig
      if (existing.orgId !== orgId || existing.type !== 'embed_config') {
        const error = new Error('Embed config not found') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }

      const updated: EmbedConfig = {
        ...existing,
        ...input,
        updatedAt: new Date().toISOString(),
      }

      await db.insert(updated)
      return updated
    },

    async archiveConfig(orgId: string, configId: string): Promise<EmbedConfig> {
      const existing = await db.get(configId) as EmbedConfig
      if (existing.orgId !== orgId || existing.type !== 'embed_config') {
        const error = new Error('Embed config not found') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }

      const updated: EmbedConfig = {
        ...existing,
        status: 'archived',
        updatedAt: new Date().toISOString(),
      }

      await db.insert(updated)
      return updated
    },

    async getByToken(token: string): Promise<EmbedConfig | null> {
      const result = await db.find({
        selector: {
          type: 'embed_config',
          token,
          status: 'active',
        },
        limit: 1,
      })

      return (result.docs[0] as EmbedConfig) || null
    },
  }
}
