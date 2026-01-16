import Fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyHelmet from '@fastify/helmet'
import fastifyCors from '@fastify/cors'
import nano from 'nano'
import { config, getSanitizedConfig } from './config.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { logger } from './logger.js'
import { createAuthService } from './services/auth.service.js'
import { createMySqlPool, testMySqlConnection } from './db/mysql.js'
import { createCouchDbAdapter, createMySqlAdapter } from './db/adapter.js'
import { createOrgService } from './services/org.service.js'
import { createAvailabilityService } from './services/availability.service.js'
import { createBookingService } from './services/booking.service.js'
import { createHealthService } from './services/health.service.js'
import { createAuditService } from './services/audit.service.js'
import { createReminderService } from './services/reminder.service.js'
import { createBootstrapService } from './services/bootstrap.service.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerOrgRoutes } from './routes/orgs.js'
import { registerSiteRoutes } from './routes/sites.js'
import { registerAvailabilityRoutes } from './routes/availability.js'
import { registerBookingRoutes } from './routes/booking.js'
import { registerAuditRoutes } from './routes/audit.js'
import { registerReminderRoutes } from './routes/reminders.js'
import { registerBootstrapRoutes } from './routes/bootstrap.js'
import { securityHeaders, requestId, httpsEnforcement } from './middleware/security.js'
import { standardRateLimit, authRateLimit, rateLimitResponseHook } from './middleware/rate-limit.js'
import { createVolunteerService } from './services/volunteer.service.js'
import { registerVolunteerRoutes } from './routes/volunteers.js'
import { requestLogger, responseLogger } from './middleware/request-logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { metricsService, metricsMiddleware, metricsResponseHook } from './lib/metrics.js'
import { createIndexes } from './db/indexes.js'
import { runMysqlMigrations } from './db/mysql/migrate.js'

const PORT = config.port
const HOST = '0.0.0.0'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureMysqlSchema() {
  const schemaPath = path.join(__dirname, 'db', 'mysql', 'schema.sql')
  const sql = await fs.readFile(schemaPath, 'utf8')

  const adminPool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  })

  await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``)
  await adminPool.end()

  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    multipleStatements: true,
  })

  try {
    await pool.query(sql)
    console.log('✅ MySQL schema ensured')
  } finally {
    await pool.end()
  }
}

async function ensureCouchDbExists(dbClient: any, dbName: string) {
  const dbs = await dbClient.db.list()
  if (!dbs.includes(dbName)) {
    await dbClient.db.create(dbName)
    console.log(`✅ Created CouchDB database: ${dbName}`)
  }
}

// Log configuration on startup (without secrets)
console.log('🔧 Server Configuration:')
console.log(JSON.stringify(getSanitizedConfig(), null, 2))
console.log('')

export async function createServer() {
  const fastify = Fastify({
    trustProxy: true,
  })

  // Initialize database connections
  let scheduleDb: any = null
  let mysqlPool = null as any
  let dbAdapter: any = null

  if (config.dbProvider === 'mysql') {
    await ensureMysqlSchema()
    await runMysqlMigrations()
    mysqlPool = createMySqlPool()
    try {
      await testMySqlConnection(mysqlPool)
      console.log('✅ MySQL connected:', `${config.mysql.host}:${config.mysql.port}/${config.mysql.database}`)
    } catch (error) {
      console.error('❌ MySQL connection failed:', error)
    }
    dbAdapter = createMySqlAdapter(mysqlPool)
  } else {
    const db = nano({
      url: config.couchdbUrl,
      requestDefaults: {
        auth: {
          username: config.couchdbUser,
          password: config.couchdbPassword,
        },
      },
    })
    console.log('🔐 CouchDB URL:', config.couchdbUrl)
    await ensureCouchDbExists(db, 'scheduleright')
    scheduleDb = db.use('scheduleright')

    // Test database connection
    try {
      const dbInfo = await scheduleDb.info()
      console.log('✅ CouchDB connected:', dbInfo.db_name, `(${dbInfo.doc_count} docs)`)
    } catch (error) {
      console.error('❌ CouchDB connection failed:', error)
    }
    dbAdapter = createCouchDbAdapter(scheduleDb)

    try {
      await createIndexes()
    } catch (error) {
      console.error('⚠️ Failed to ensure CouchDB indexes:', error)
    }
  }

  // Initialize services
  const authService = createAuthService(dbAdapter)
  const orgService = createOrgService(dbAdapter)
  const availabilityService = createAvailabilityService(dbAdapter)
  const bookingService = createBookingService(dbAdapter)
  const healthService = createHealthService({
    provider: config.dbProvider,
    couchDb: scheduleDb,
    mysqlPool,
  })
  const auditService = createAuditService(dbAdapter)
  const reminderService = createReminderService(dbAdapter)
  const volunteerService = createVolunteerService(dbAdapter)
  const bootstrapService = createBootstrapService(dbAdapter)
  await bootstrapService.ensureConfigDefaults()

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

  // Security Middleware
  fastify.addHook('onRequest', requestId)
  fastify.addHook('onRequest', securityHeaders)
  if (config.nodeEnv === 'production') {
    fastify.addHook('onRequest', httpsEnforcement)
  }

  // Apply standard rate limiting to all routes
  fastify.addHook('onRequest', standardRateLimit)

  // Block all routes until bootstrap completes (allow health + bootstrap endpoints)
  fastify.addHook('onRequest', async (request, reply) => {
    const allowList = ['/api/v1/bootstrap', '/api/v1/bootstrap/status', '/health', '/readiness', '/status', '/metrics']
    const path = request.routerPath || request.url
    if (allowList.some((p) => path.startsWith(p))) {
      return
    }

    const ready = await bootstrapService.isBootstrapped()
    if (!ready) {
      return reply.status(503).send({
        error: 'System not initialized. Run /api/v1/bootstrap first.',
        code: 'BOOTSTRAP_REQUIRED',
        statusCode: 503,
        timestamp: new Date().toISOString(),
      })
    }
  })

  // Monitoring Middleware
  fastify.addHook('onRequest', requestLogger)
  fastify.addHook('onRequest', metricsMiddleware)
  fastify.addHook('onResponse', responseLogger)
  fastify.addHook('onResponse', metricsResponseHook)
  fastify.addHook('onResponse', rateLimitResponseHook)

  // Error Handler (must be set after routes)
  fastify.setErrorHandler(errorHandler)

  // Health and Status Endpoints
  // Basic health check (for quick liveness probes)
  fastify.get('/health', async (_request, reply) => {
    const isHealthy = healthService.isHealthy()
    return reply.status(isHealthy ? 200 : 503).send({
      status: isHealthy ? 'ok' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  // Detailed readiness check (for load balancers and monitoring)
  fastify.get('/readiness', async (_request, reply) => {
    const healthStatus = await healthService.performHealthChecks()
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503
    return reply.status(statusCode).send(healthStatus)
  })

  // Performance metrics endpoint
  fastify.get('/metrics', async (_request, reply) => {
    const metrics = metricsService.getAllMetrics()
    return reply.status(200).send({
      timestamp: new Date().toISOString(),
      ...metrics,
    })
  })

  // Detailed status page
  fastify.get('/status', async (_request, reply) => {
    const services = {
      auth: { status: 'ready', endpoint: '/api/v1/auth/login' },
      users: { status: 'ready', endpoint: '/api/v1/users/me' },
      organizations: { status: 'ready', endpoints: ['/api/v1/orgs', '/api/v1/orgs/:orgId'] },
      sites: { status: 'ready', endpoints: ['/api/v1/orgs/:orgId/sites'] },
      availability: { status: 'ready', endpoints: ['/api/v1/sites/:siteId/availability', '/api/v1/sites/:siteId/availability/:slotId'] },
      bookings: { status: 'ready', endpoints: ['/api/v1/sites/:siteId/bookings', '/api/v1/bookings/me', '/api/v1/bookings/:bookingId'] },
    }

    let dbStatus = 'disconnected'
    let dbInfo: any = null
    try {
      if (config.dbProvider === 'mysql') {
        const [rows] = await mysqlPool.query('SELECT 1 as ok')
        dbInfo = { provider: 'mysql', ok: (rows as any[])[0]?.ok }
        dbStatus = 'connected'
      } else if (scheduleDb) {
        dbInfo = await scheduleDb.info()
        dbStatus = 'connected'
      }
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
          <strong>Database (${config.dbProvider === 'mysql' ? 'MySQL' : 'CouchDB'})</strong>
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

  // Register bootstrap routes
  await registerBootstrapRoutes(fastify, bootstrapService)

  // Register auth routes
  await registerAuthRoutes(fastify, authService)

  // Register org routes
  await registerOrgRoutes(fastify, orgService)

  // Register site routes
  await registerSiteRoutes(fastify, orgService)

  // Register availability routes
  await registerAvailabilityRoutes(fastify, availabilityService)

  // Register booking routes
  await registerBookingRoutes(fastify, bookingService, availabilityService)

  // Register audit routes
  await registerAuditRoutes(fastify, auditService)

  // Register reminder routes
  await registerReminderRoutes(fastify, reminderService)

  // Register volunteer routes
  await registerVolunteerRoutes(fastify, volunteerService)

  return fastify
}

export async function main() {
  try {
    const fastify = await createServer()
    await fastify.listen({ host: HOST, port: PORT })
    console.log(`✅ Server running on http://${HOST}:${PORT}`)
  } catch (error) {
    logger.error(error)
    process.exit(1)
  }
}

// Run if this is the main module
main().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
