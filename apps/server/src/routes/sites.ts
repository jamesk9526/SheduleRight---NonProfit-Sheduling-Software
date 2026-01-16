import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { OrgService } from '../services/org.service.js'
import { CreateSiteSchema } from '../services/org.service.js'
import { authMiddleware, requireRole, enforceTenancy } from '../middleware/auth.js'

/**
 * Site Routes
 * 
 * Endpoints:
 * - GET /api/v1/orgs/:orgId/sites - List sites in org (org members)
 * - POST /api/v1/orgs/:orgId/sites - Create site (STAFF+ only)
 */
export async function registerSiteRoutes(
  fastify: FastifyInstance,
  orgService: OrgService
) {
  /**
   * GET /api/v1/orgs/:orgId/sites
   * List all sites in organization
   * RBAC: User must be member of org
   */
  fastify.get<{
    Params: { orgId: string }
  }>(
    '/api/v1/orgs/:orgId/sites',
    {
      preHandler: [authMiddleware, enforceTenancy()],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params

        // Verify org exists
        const org = await orgService.getOrgById(orgId)
        if (!org) {
          return reply.status(404).send({
            error: 'Organization not found',
            code: 'ORG_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        const sites = await orgService.listSites(orgId)

        return reply.status(200).send({
          data: sites,
          total: sites.length,
        })
      } catch (error) {
        console.error('List sites error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve sites',
          code: 'SITE_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/orgs/:orgId/sites
   * Create new site in organization
   * RBAC: STAFF or ADMIN only
   */
  fastify.post<{
    Params: { orgId: string }
    Body: z.infer<typeof CreateSiteSchema>
  }>(
    '/api/v1/orgs/:orgId/sites',
    {
      preHandler: [authMiddleware, requireRole('STAFF', 'ADMIN'), enforceTenancy()],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params

        // Verify org exists
        const org = await orgService.getOrgById(orgId)
        if (!org) {
          return reply.status(404).send({
            error: 'Organization not found',
            code: 'ORG_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        // Validate request body
        const validationResult = CreateSiteSchema.safeParse(request.body)
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + validationResult.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const site = await orgService.createSite(orgId, validationResult.data)

        return reply.status(201).send(site)
      } catch (error) {
        console.error('Create site error:', error)
        return reply.status(500).send({
          error: 'Failed to create site',
          code: 'SITE_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
