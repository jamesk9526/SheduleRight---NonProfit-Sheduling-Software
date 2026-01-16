import type { ServerScope } from 'nano'
import type { MySqlPool } from '../db/mysql.js'
import { config } from '../config.js'

export interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy'
  message?: string
  responseTime?: number
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  checks: HealthCheck[]
  system: {
    memory: {
      used: number
      total: number
      percentage: number
    }
    cpu: {
      usage: number
    }
  }
}

/**
 * Health Check Service
 * Provides detailed health status for monitoring and load balancers
 */
export function createHealthService(options: { provider: 'couchdb' | 'mysql'; couchDb?: ServerScope; mysqlPool?: MySqlPool }) {
  /**
   * Check database connectivity
   */
  async function checkDatabase(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      if (options.provider === 'mysql') {
        if (!options.mysqlPool) throw new Error('MySQL pool not initialized')
        await options.mysqlPool.query('SELECT 1')
        return {
          name: 'database',
          status: 'healthy',
          message: 'MySQL connection successful',
          responseTime: Date.now() - start,
        }
      }

      if (!options.couchDb) throw new Error('CouchDB client not initialized')
      await options.couchDb.info()
      return {
        name: 'database',
        status: 'healthy',
        message: 'CouchDB connection successful',
        responseTime: Date.now() - start,
      }
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: Date.now() - start,
      }
    }
  }

  /**
   * Check memory usage
   */
  function checkMemory(): HealthCheck {
    const memUsage = process.memoryUsage()
    const totalMem = memUsage.heapTotal
    const usedMem = memUsage.heapUsed
    const percentage = (usedMem / totalMem) * 100

    // Flag as unhealthy if using >90% of heap
    const status = percentage > 90 ? 'unhealthy' : 'healthy'

    return {
      name: 'memory',
      status,
      message: `Using ${(usedMem / 1024 / 1024).toFixed(2)} MB of ${(totalMem / 1024 / 1024).toFixed(2)} MB (${percentage.toFixed(1)}%)`,
    }
  }

  /**
   * Check uptime
   */
  function checkUptime(): HealthCheck {
    const uptime = process.uptime()
    return {
      name: 'uptime',
      status: 'healthy',
      message: `Server running for ${Math.floor(uptime)} seconds`,
    }
  }

  /**
   * Get system metrics
   */
  function getSystemMetrics() {
    const memUsage = process.memoryUsage()
    const totalMem = memUsage.heapTotal
    const usedMem = memUsage.heapUsed

    return {
      memory: {
        used: usedMem,
        total: totalMem,
        percentage: (usedMem / totalMem) * 100,
      },
      cpu: {
        usage: process.cpuUsage().user / 1000000, // Convert to seconds
      },
    }
  }

  /**
   * Perform all health checks
   */
  async function performHealthChecks(): Promise<HealthStatus> {
    const checks: HealthCheck[] = []

    // Run all checks
    checks.push(await checkDatabase())
    checks.push(checkMemory())
    checks.push(checkUptime())

    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy')
    const overallStatus = hasUnhealthy ? 'unhealthy' : 'healthy'

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      system: getSystemMetrics(),
    }
  }

  /**
   * Basic health check (for quick liveness probes)
   */
  function isHealthy(): boolean {
    // Just check if process is running
    return process.uptime() > 0
  }

  return {
    performHealthChecks,
    isHealthy,
    checkDatabase,
    checkMemory,
    checkUptime,
  }
}

export type HealthService = ReturnType<typeof createHealthService>
