import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import nano from 'nano'
import { config } from './config.js'
import { logger } from './logger.js'
import { createAuthService } from './services/auth.service.js'
import { registerAuthRoutes } from './routes/auth.js'

const PORT = config.port
const HOST = '0.0.0.0'

export async function createServer() {
  const fastify = Fastify({
    trustProxy: true,
  })

  // Initialize CouchDB connection
  const db = nano(config.couchdbUrl)
  const scheduleDb = db.use('scheduleright')

  // Initialize auth service
  const authService = createAuthService(scheduleDb)

  // Plugins
  await fastify.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })

  await fastify.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true,
  })

  await fastify.register(fastifyCookie)

  // Health check
  fastify.get('/health', async (_request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  // Register auth routes
  await registerAuthRoutes(fastify, authService)

  // Route stubs (temporary)
  fastify.get('/api/v1/availability', async (_request, reply) => {
    return { message: 'Availability endpoint (TODO)' }
  })

  fastify.post('/api/v1/bookings', async (_request, reply) => {
    return { message: 'Bookings endpoint (TODO)' }
  })

  return fastify
}

export async function main() {
  try {
    const fastify = await createServer()
    await fastify.listen({ host: HOST, port: PORT })
    console.log(`Server running on http://${HOST}:${PORT}`)
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
