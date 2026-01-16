import type { FastifyInstance } from 'fastify'
import { BootstrapSchema } from '../services/bootstrap.service.js'

export async function registerBootstrapRoutes(
  fastify: FastifyInstance,
  bootstrapService: ReturnType<typeof createBootstrapService>
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
      return reply.status(201).send({ message: 'Bootstrap complete', ...result })
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
    if (request.routerPath?.startsWith('/api/v1/bootstrap')) {
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
