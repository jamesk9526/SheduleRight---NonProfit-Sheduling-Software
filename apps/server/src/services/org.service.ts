import { randomUUID } from 'crypto'
import { z } from 'zod'

// Nano type - using any until we have proper types
type ServerScope = any

// Type definitions
export interface Organization {
  _id: string
  _rev?: string
  type: 'org'
  id: string
  name: string
  tenantId: string
  settings: {
    timezone: string
    businessHours?: string
    requireVerification?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface Site {
  _id: string
  _rev?: string
  type: 'site'
  id: string
  orgId: string
  name: string
  address?: string
  timezone: string
  createdAt: string
  updatedAt: string
}

// Validation schemas
export const CreateOrgSchema = z.object({
  name: z.string().min(3).max(100),
  tenantId: z.string().optional(),
  settings: z.object({
    timezone: z.string(),
    businessHours: z.string().optional(),
    requireVerification: z.boolean().optional(),
  }).optional(),
})

export const CreateSiteSchema = z.object({
  name: z.string().min(3).max(100),
  address: z.string().optional(),
  timezone: z.string(),
})

export type CreateOrgInput = z.infer<typeof CreateOrgSchema>
export type CreateSiteInput = z.infer<typeof CreateSiteSchema>

/**
 * Organization Service
 * Handles CRUD operations for organizations and sites in CouchDB
 */
export function createOrgService(db: ServerScope) {
  return {
    /**
     * List all organizations
     */
    async listOrgs(): Promise<Organization[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'org',
          },
          limit: 1000,
        })

        return result.docs as Organization[]
      } catch (error) {
        console.error('Error listing orgs:', error)
        throw new Error('Failed to retrieve organizations')
      }
    },

    /**
     * Get organization by ID
     */
    async getOrgById(orgId: string): Promise<Organization | null> {
      try {
        const result = await db.find({
          selector: {
            type: 'org',
            id: orgId,
          },
          limit: 1,
        })

        if (result.docs.length === 0) {
          return null
        }

        return result.docs[0] as Organization
      } catch (error) {
        console.error('Error getting org:', error)
        throw new Error('Failed to retrieve organization')
      }
    },

    /**
     * Create new organization
     */
    async createOrg(data: CreateOrgInput): Promise<Organization> {
      try {
        const orgId = `org:${randomUUID()}`
        const tenantId = data.tenantId || `tenant:${randomUUID()}`
        const now = new Date().toISOString()

        const org: Organization = {
          _id: orgId,
          type: 'org',
          id: orgId,
          name: data.name,
          tenantId,
          settings: data.settings || {
            timezone: 'UTC',
          },
          createdAt: now,
          updatedAt: now,
        }

        const response = await db.insert(org)

        if (!response.ok) {
          throw new Error('Failed to insert organization')
        }

        return { ...org, _rev: response.rev }
      } catch (error) {
        console.error('Error creating org:', error)
        throw new Error('Failed to create organization')
      }
    },

    /**
     * List all sites for an organization
     */
    async listSites(orgId: string): Promise<Site[]> {
      try {
        const result = await db.find({
          selector: {
            type: 'site',
            orgId,
          },
          limit: 1000,
        })

        return result.docs as Site[]
      } catch (error) {
        console.error('Error listing sites:', error)
        throw new Error('Failed to retrieve sites')
      }
    },

    /**
     * Get site by ID
     */
    async getSiteById(siteId: string): Promise<Site | null> {
      try {
        const result = await db.find({
          selector: {
            type: 'site',
            id: siteId,
          },
          limit: 1,
        })

        if (result.docs.length === 0) {
          return null
        }

        return result.docs[0] as Site
      } catch (error) {
        console.error('Error getting site:', error)
        throw new Error('Failed to retrieve site')
      }
    },

    /**
     * Create new site in organization
     */
    async createSite(orgId: string, data: CreateSiteInput): Promise<Site> {
      try {
        const siteId = `site:${randomUUID()}`
        const now = new Date().toISOString()

        const site: Site = {
          _id: siteId,
          type: 'site',
          id: siteId,
          orgId,
          name: data.name,
          address: data.address,
          timezone: data.timezone,
          createdAt: now,
          updatedAt: now,
        }

        const response = await db.insert(site)

        if (!response.ok) {
          throw new Error('Failed to insert site')
        }

        return { ...site, _rev: response.rev }
      } catch (error) {
        console.error('Error creating site:', error)
        throw new Error('Failed to create site')
      }
    },
  }
}

export type OrgService = ReturnType<typeof createOrgService>
