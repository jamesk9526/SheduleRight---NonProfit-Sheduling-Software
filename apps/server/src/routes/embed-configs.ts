import type { FastifyInstance } from 'fastify'
import { EmbedConfigSchema } from '../services/embed-config.service.js'
import type { createEmbedConfigService } from '../services/embed-config.service.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { AuditActions } from '../services/audit.service.js'
import type { createAuditService } from '../services/audit.service.js'

export async function registerEmbedConfigRoutes(
  fastify: FastifyInstance,
  embedConfigService: ReturnType<typeof createEmbedConfigService>,
  auditService?: ReturnType<typeof createAuditService>
) {
  fastify.get('/api/v1/embed-configs', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const configs = await embedConfigService.listConfigs(orgId)
      return reply.status(200).send({ data: configs, total: configs.length })
    } catch (error) {
      console.error('List embed configs error:', error)
      return reply.status(500).send({
        error: 'Failed to list embed configs',
        code: 'EMBED_CONFIG_LIST_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.post('/api/v1/embed-configs', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = EmbedConfigSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const config = await embedConfigService.createConfig(orgId, parsed.data)

      if (auditService && request.user?.userId) {
        await auditService.createAuditLog({
          action: AuditActions.EMBED_CONFIG_CREATE,
          userId: request.user.userId,
          orgId,
          resourceType: 'embed_config',
          resourceId: config._id,
          details: { name: config.name, siteId: config.siteId },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        })
      }
      return reply.status(201).send(config)
    } catch (error) {
      console.error('Create embed config error:', error)
      return reply.status(500).send({
        error: 'Failed to create embed config',
        code: 'EMBED_CONFIG_CREATE_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.put('/api/v1/embed-configs/:configId', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { configId } = request.params as { configId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const parsed = EmbedConfigSchema.partial().safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const config = await embedConfigService.updateConfig(orgId, configId, parsed.data)

      if (auditService && request.user?.userId) {
        await auditService.createAuditLog({
          action: AuditActions.EMBED_CONFIG_UPDATE,
          userId: request.user.userId,
          orgId,
          resourceType: 'embed_config',
          resourceId: config._id,
          details: { name: config.name, siteId: config.siteId },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        })
      }
      return reply.status(200).send(config)
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : 500
      return reply.status(status).send({
        error: status === 404 ? 'Embed config not found' : 'Failed to update embed config',
        code: status === 404 ? 'EMBED_CONFIG_NOT_FOUND' : 'EMBED_CONFIG_UPDATE_FAILED',
        statusCode: status,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.delete('/api/v1/embed-configs/:configId', { preHandler: [authMiddleware, requireRole('ADMIN')] }, async (request, reply) => {
    try {
      const orgId = request.user?.orgId
      const { configId } = request.params as { configId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const config = await embedConfigService.archiveConfig(orgId, configId)

      if (auditService && request.user?.userId) {
        await auditService.createAuditLog({
          action: AuditActions.EMBED_CONFIG_ARCHIVE,
          userId: request.user.userId,
          orgId,
          resourceType: 'embed_config',
          resourceId: config._id,
          details: { name: config.name, siteId: config.siteId },
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        })
      }
      return reply.status(200).send(config)
    } catch (error: any) {
      const status = error?.statusCode === 404 ? 404 : 500
      return reply.status(status).send({
        error: status === 404 ? 'Embed config not found' : 'Failed to delete embed config',
        code: status === 404 ? 'EMBED_CONFIG_NOT_FOUND' : 'EMBED_CONFIG_DELETE_FAILED',
        statusCode: status,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.get('/api/v1/embed-configs/:configId/audit', { preHandler: [authMiddleware, requireRole('ADMIN', 'STAFF')] }, async (request, reply) => {
    if (!auditService) {
      return reply.status(501).send({
        error: 'Audit service not configured',
        code: 'AUDIT_NOT_AVAILABLE',
        statusCode: 501,
        timestamp: new Date().toISOString(),
      })
    }

    try {
      const orgId = request.user?.orgId
      const { configId } = request.params as { configId: string }

      if (!orgId) {
        return reply.status(400).send({
          error: 'Missing organization context',
          code: 'ORG_CONTEXT_REQUIRED',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const logs = await auditService.getResourceAuditTrail('embed_config', configId)
      const filtered = logs.filter((log) => log.orgId === orgId)
      return reply.status(200).send({ data: filtered })
    } catch (error) {
      console.error('Embed audit logs error:', error)
      return reply.status(500).send({
        error: 'Failed to load audit logs',
        code: 'EMBED_AUDIT_FAILED',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      })
    }
  })
}
