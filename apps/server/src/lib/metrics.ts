/**
 * Performance Metrics Service
 * Tracks request counts, response times, and system metrics
 */

interface RequestMetrics {
  count: number
  totalDuration: number
  minDuration: number
  maxDuration: number
  durations: number[] // For percentile calculation
}

interface EndpointMetrics {
  [endpoint: string]: RequestMetrics
}

interface SystemMetrics {
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    user: number
    system: number
  }
}

class MetricsService {
  private metrics: EndpointMetrics = {}
  private startTime = Date.now()

  /**
   * Record a request metric
   */
  recordRequest(endpoint: string, duration: number) {
    if (!this.metrics[endpoint]) {
      this.metrics[endpoint] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        durations: [],
      }
    }

    const metric = this.metrics[endpoint]
    metric.count++
    metric.totalDuration += duration
    metric.minDuration = Math.min(metric.minDuration, duration)
    metric.maxDuration = Math.max(metric.maxDuration, duration)
    metric.durations.push(duration)

    // Keep only last 1000 durations for percentile calculation
    if (metric.durations.length > 1000) {
      metric.durations.shift()
    }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string) {
    const metric = this.metrics[endpoint]
    if (!metric || metric.count === 0) {
      return null
    }

    const sorted = [...metric.durations].sort((a, b) => a - b)
    
    return {
      count: metric.count,
      avgDuration: metric.totalDuration / metric.count,
      minDuration: metric.minDuration,
      maxDuration: metric.maxDuration,
      p50: this.calculatePercentile(sorted, 50),
      p95: this.calculatePercentile(sorted, 95),
      p99: this.calculatePercentile(sorted, 99),
    }
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    const endpoints: any = {}

    for (const [endpoint, metric] of Object.entries(this.metrics)) {
      if (metric.count > 0) {
        endpoints[endpoint] = this.getEndpointMetrics(endpoint)
      }
    }

    return {
      endpoints,
      totalRequests: Object.values(this.metrics).reduce(
        (sum, m) => sum + m.count,
        0
      ),
      system: this.getSystemMetrics(),
    }
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()

    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: {
        used: memUsage.heapUsed,
        total: memUsage.heapTotal,
        percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100,
      },
      cpu: {
        user: cpuUsage.user / 1000000, // Convert to seconds
        system: cpuUsage.system / 1000000,
      },
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {}
    this.startTime = Date.now()
  }

  /**
   * Get metrics summary for logging
   */
  getSummary() {
    const all = this.getAllMetrics()
    const topEndpoints = Object.entries(all.endpoints)
      .sort(([, a]: any, [, b]: any) => b.count - a.count)
      .slice(0, 10)

    return {
      totalRequests: all.totalRequests,
      topEndpoints: topEndpoints.map(([endpoint, metrics]) => ({
        endpoint,
        ...metrics,
      })),
      system: all.system,
    }
  }
}

// Singleton instance
export const metricsService = new MetricsService()

/**
 * Middleware to track request metrics
 */
export async function metricsMiddleware(request: any, reply: any) {
  const startTime = Date.now()

  reply.addHook('onResponse', (request: any, reply: any, done: any) => {
    const duration = Date.now() - startTime
    const endpoint = `${request.method} ${request.routeOptions.url || request.url}`
    
    metricsService.recordRequest(endpoint, duration)
    done()
  })
}
