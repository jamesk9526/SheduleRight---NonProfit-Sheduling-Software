import type { FastifyInstance } from 'fastify'
import type { AuditService } from '../services/audit.service.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

/**
 * Audit Log Routes
 * Endpoints for querying audit logs (admin only)
 */
export async function registerAuditRoutes(
  fastify: FastifyInstance,
  auditService: AuditService
) {
  /**
   * GET /api/v1/audit/logs
   * Query audit logs
   * RBAC: ADMIN or STAFF
   */
  fastify.get<{
    Querystring: {
      orgId?: string
      userId?: string
      action?: string
      resourceType?: string
      startDate?: string
      endDate?: string
      limit?: string
    }
  }>(
    '/api/v1/audit/logs',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request, reply) => {
      try {
        const {
          orgId,
          userId,
          action,
          resourceType,
          startDate,
          endDate,
          limit,
        } = request.query

        const logs = await auditService.getAuditLogs({
          orgId,
          userId,
          action,
          resourceType,
          startDate,
          endDate,
          limit: limit ? parseInt(limit) : 100,
        })

        return reply.status(200).send({
          data: logs,
          total: logs.length,
        })
      } catch (error) {
        console.error('Get audit logs error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve audit logs',
          code: 'AUDIT_LOGS_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * GET /api/v1/audit/stats
   * Get audit log statistics
   * RBAC: ADMIN or STAFF
   */
  fastify.get<{
    Querystring: {
      orgId: string
      days?: string
    }
  }>(
    '/api/v1/audit/stats',
    {
      preHandler: [authMiddleware, requireRole('STAFF')],
    },
    async (request, reply) => {
      try {
        const { orgId, days } = request.query

        if (!orgId) {
          return reply.status(400).send({
            error: 'orgId is required',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            timestamp: new Date().toISOString(),
          })
        }

        const stats = await auditService.getAuditStats(
          orgId,
          days ? parseInt(days) : 7
        )

        return reply.status(200).send(stats)
      } catch (error) {
        console.error('Get audit stats error:', error)
        return reply.status(500).send({
          error: 'Failed to retrieve audit statistics',
          code: 'AUDIT_STATS_FAILED',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )
}
