import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { OrgService } from '../services/org.service.js'
import { CreateOrgSchema } from '../services/org.service.js'
import { authMiddleware, requireRole, enforceTenancy } from '../middleware/auth.js'

/**
 * Organization Routes
 * 
 * Endpoints:
 * - GET /api/v1/orgs - List all orgs (ADMIN only)
 * - GET /api/v1/orgs/:orgId - Get org details (org members only)
 * - POST /api/v1/orgs - Create org (ADMIN only)
 */
export async function registerOrgRoutes(
  fastify: FastifyInstance,
  orgService: OrgService
) {
  /**
   * GET /api/v1/orgs
   * List all organizations
   * RBAC: ADMIN only
   */
  fastify.get(
    '/api/v1/orgs',
    {
      preHandler: [authMiddleware, requireRole('ADMIN')],
    },
    async (request, reply) => {
      try {
        const orgs = await orgService.listOrgs()

        return reply.status(200).send({
          data: orgs,
          total: orgs.length,
        })
      } catch (error) {
        console.error('List orgs error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve organizations',
          code: 'ORG_LIST_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/orgs/:orgId
   * Get organization details
   * RBAC: User must be member of org
   */
  fastify.get<{
    Params: { orgId: string }
  }>(
    '/api/v1/orgs/:orgId',
    {
      preHandler: [authMiddleware, enforceTenancy()],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params

        const org = await orgService.getOrgById(orgId)

        if (!org) {
          return reply.status(404).send({
            error: 'Organization not found',
            code: 'ORG_NOT_FOUND',
            statusCode: 404,
            timestamp: new Date().toISOString(),
          })
        }

        return reply.status(200).send(org)
      } catch (error) {
        console.error('Get org error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve organization',
          code: 'ORG_GET_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/orgs
   * Create new organization
   * RBAC: ADMIN only
   */
  fastify.post<{
    Body: z.infer<typeof CreateOrgSchema>
  }>(
    '/api/v1/orgs',
    {
      preHandler: [authMiddleware, requireRole('ADMIN')],
    },
    async (request, reply) => {
      try {
        // Validate request body
        const validationResult = CreateOrgSchema.safeParse(request.body)
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + validationResult.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const org = await orgService.createOrg(validationResult.data)

        return reply.status(201).send(org)
      } catch (error) {
        console.error('Create org error:', error)
        return reply.status(500).send({
          error: 'Failed to create organization',
          code: 'ORG_CREATE_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * PUT /api/v1/orgs/:orgId
   * Update organization (including branding)
   * RBAC: ADMIN or org member with appropriate role
   */
  fastify.put<{
    Params: { orgId: string }
    Body: Partial<z.infer<typeof CreateOrgSchema>>
  }>(
    '/api/v1/orgs/:orgId',
    {
      preHandler: [authMiddleware, enforceTenancy()],
    },
    async (request, reply) => {
      try {
        const { orgId } = request.params

        // Validate request body (partial update)
        const validationResult = CreateOrgSchema.partial().safeParse(request.body)
        if (!validationResult.success) {
          return reply.status(400).send({
            error: 'Invalid request: ' + validationResult.error.errors[0].message,
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const updated = await orgService.updateOrg(orgId, validationResult.data)

        return reply.status(200).send(updated)
      } catch (error) {
        console.error('Update org error:', error)
        const message = error instanceof Error ? error.message : 'Failed to update organization'
        const status = message.includes('not found') ? 404 : 500
        return reply.status(status).send({
          error: message,
          code: status === 404 ? 'ORG_NOT_FOUND' : 'ORG_UPDATE_FAILED',
          statusCode: status,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
