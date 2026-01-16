import type { FastifyInstance } from 'fastify'
import { BootstrapSchema } from '../services/bootstrap.service.js'
import { generateTokens } from '../services/auth.service.js'

export async function registerBootstrapRoutes(
  fastify: FastifyInstance,
  bootstrapService: ReturnType<typeof import('../services/bootstrap.service.js').createBootstrapService>
) {
  fastify.post('/api/v1/bootstrap', async (request, reply) => {
    try {
      const parsed = BootstrapSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Invalid request: ' + parsed.error.errors[0].message,
          code: 'VALIDATION_ERROR',
          statusCode: 400,
          timestamp: new Date().toISOString(),
        })
      }

      const result = await bootstrapService.bootstrap(parsed.data)
      
      // Generate JWT token for immediate login
      const tokens = generateTokens({
        id: result.adminUserId,
        email: parsed.data.adminEmail,
        name: parsed.data.adminName,
        roles: ['ADMIN'],
        orgId: result.orgId,
        verified: true,
        active: true,
      })
      
      // Set refresh token as HttpOnly cookie
      reply.setCookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })

      return reply.status(201).send({
        message: 'Bootstrap complete',
        orgId: result.orgId,
        adminUserId: result.adminUserId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      })
    } catch (error: any) {
      const status = error?.statusCode === 409 ? 409 : 500
      return reply.status(status).send({
        error: status === 409 ? 'System already bootstrapped' : 'Bootstrap failed',
        code: status === 409 ? 'BOOTSTRAP_EXISTS' : 'BOOTSTRAP_FAILED',
        statusCode: status,
        timestamp: new Date().toISOString(),
      })
    }
  })

  fastify.get('/api/v1/bootstrap/status', async (_request, reply) => {
    const done = await bootstrapService.isBootstrapped()
    return reply.status(200).send({ bootstrapped: done })
  })

  // Optional protection: block bootstrap call if already initialized
  fastify.addHook('preHandler', async (request, reply) => {
    const routeUrl = request.routeOptions?.url || request.url
    if (routeUrl.startsWith('/api/v1/bootstrap')) {
      const done = await bootstrapService.isBootstrapped()
      if (done) {
        return reply.status(409).send({
          error: 'System already bootstrapped',
          code: 'BOOTSTRAP_EXISTS',
          statusCode: 409,
          timestamp: new Date().toISOString(),
        })
      }
    }
  })
}
