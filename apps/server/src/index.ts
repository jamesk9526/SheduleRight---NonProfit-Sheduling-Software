import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import nano from 'nano'
import { config } from './config.js'
import { logger } from './logger.js'
import { createAuthService } from './services/auth.service.js'
import { createOrgService } from './services/org.service.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerOrgRoutes } from './routes/orgs.js'
import { registerSiteRoutes } from './routes/sites.js'

const PORT = config.port
const HOST = '0.0.0.0'

export async function createServer() {
  const fastify = Fastify({
    trustProxy: true,
  })

  // Initialize CouchDB connection
  const db = nano(config.couchdbUrl)
  const scheduleDb = db.use('scheduleright')

  // Initialize services
  const authService = createAuthService(scheduleDb)
  const orgService = createOrgService(scheduleDb)

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

  // Health and Status Endpoints
  fastify.get('/health', async (_request, reply) => {
    let dbStatus = 'connected'
    try {
      await scheduleDb.info()
    } catch (error) {
      dbStatus = 'disconnected'
    }

    return reply.status(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.nodeEnv,
      services: {
        api: 'running',
        database: dbStatus,
        cors: 'enabled',
        auth: 'ready',
      },
      versions: {
        node: process.version,
        fastify: '4.25.2',
      },
    })
  })

  // Detailed status page
  fastify.get('/status', async (_request, reply) => {
    const services = {
      auth: { status: 'ready', endpoint: '/api/v1/auth/login' },
      users: { status: 'ready', endpoint: '/api/v1/users/me' },
      organizations: { status: 'ready', endpoints: ['/api/v1/orgs', '/api/v1/orgs/:orgId'] },
      sites: { status: 'ready', endpoints: ['/api/v1/orgs/:orgId/sites'] },
      availability: { status: 'TODO', endpoint: '/api/v1/availability' },
      bookings: { status: 'TODO', endpoint: '/api/v1/bookings' },
    }

    let dbStatus = 'disconnected'
    let dbInfo: any = null
    try {
      dbInfo = await scheduleDb.info()
      dbStatus = 'connected'
    } catch (error) {
      dbStatus = 'error: ' + (error instanceof Error ? error.message : 'unknown')
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ScheduleRight API Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; }
    h1 { color: #0284c7; margin-bottom: 30px; }
    h2 { color: #1e40af; margin-top: 30px; margin-bottom: 15px; font-size: 18px; }
    .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .status-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .status-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .status-value { font-family: monospace; font-size: 14px; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-running { background: #d1fae5; color: #065f46; }
    .badge-ready { background: #dbeafe; color: #0c4a6e; }
    .badge-todo { background: #fef3c7; color: #92400e; }
    .badge-error { background: #fee2e2; color: #7f1d1d; }
    .badge-connected { background: #d1fae5; color: #065f46; }
    .badge-disconnected { background: #fee2e2; color: #7f1d1d; }
    .endpoints { background: #f9fafb; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 13px; }
    .endpoint-item { margin: 8px 0; }
    .endpoint-item code { background: #e5e7eb; padding: 2px 6px; border-radius: 3px; }
    table { width: 100%; border-collapse: collapse; background: white; margin-top: 10px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; }
    .health-good { color: #059669; }
    .health-bad { color: #dc2626; }
    footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏥 ScheduleRight API Status</h1>
    
    <div class="status-grid">
      <div class="status-card">
        <div class="status-header">
          <strong>API Server</strong>
          <span class="badge badge-running">Running</span>
        </div>
        <div class="status-value">
          <div>Port: 3001</div>
          <div>Environment: ${config.nodeEnv}</div>
          <div>Uptime: ${Math.floor(process.uptime())}s</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-header">
          <strong>Database (CouchDB)</strong>
          <span class="badge ${dbStatus === 'connected' ? 'badge-connected' : 'badge-disconnected'}">
            ${dbStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <div class="status-value">
          <div>URL: ${config.couchdbUrl}</div>
          <div>${dbStatus === 'connected' ? `DB: ${dbInfo?.db_name || 'N/A'}` : `Status: ${dbStatus}`}</div>
        </div>
      </div>

      <div class="status-card">
        <div class="status-header">
          <strong>CORS</strong>
          <span class="badge badge-ready">Enabled</span>
        </div>
        <div class="status-value">
          <div>Origins: localhost:3000</div>
          <div>Credentials: ✓</div>
        </div>
      </div>
    </div>

    <h2>📋 API Services</h2>
    <table>
      <thead>
        <tr>
          <th>Service</th>
          <th>Status</th>
          <th>Endpoints</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(services).map(([key, service]: any) => `
          <tr>
            <td><strong>${key}</strong></td>
            <td>
              <span class="badge ${service.status === 'ready' ? 'badge-ready' : 'badge-todo'}">
                ${service.status}
              </span>
            </td>
            <td>
              ${Array.isArray(service.endpoints) 
                ? service.endpoints.map((e: string) => `<code>${e}</code>`).join(', ')
                : `<code>${service.endpoint}</code>`
              }
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>🔗 Quick Links</h2>
    <div class="endpoints">
      <div class="endpoint-item">📝 Login: <code>POST /api/v1/auth/login</code></div>
      <div class="endpoint-item">👤 Current User: <code>GET /api/v1/users/me</code></div>
      <div class="endpoint-item">🏢 List Orgs: <code>GET /api/v1/orgs</code></div>
      <div class="endpoint-item">📍 List Sites: <code>GET /api/v1/orgs/:orgId/sites</code></div>
      <div class="endpoint-item">🔄 Health Check: <code>GET /health</code></div>
    </div>

    <footer>
      <p>ScheduleRight API • ${new Date().toISOString()}</p>
      <p>All systems operational ✓</p>
    </footer>
  </div>
</body>
</html>
    `

    return reply.header('Content-Type', 'text/html').send(html)
  })

  // Register auth routes
  await registerAuthRoutes(fastify, authService)

  // Register org routes
  await registerOrgRoutes(fastify, orgService)

  // Register site routes
  await registerSiteRoutes(fastify, orgService)

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
