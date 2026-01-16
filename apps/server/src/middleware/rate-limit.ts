import type { FastifyRequest, FastifyReply } from 'fastify'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  skipSuccessfulRequests?: boolean
}

/**
 * Create rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
  } = options

  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Get client identifier (IP address or user ID)
    const clientId = request.user?.id || request.ip || 'unknown'
    const key = `${request.routeOptions.url}:${clientId}`

    const now = Date.now()

    // Initialize or get existing entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      }
    }

    // Increment request count
    store[key].count++

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', maxRequests)
    reply.header('X-RateLimit-Remaining', Math.max(0, maxRequests - store[key].count))
    reply.header('X-RateLimit-Reset', store[key].resetTime)

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      reply.header('Retry-After', Math.ceil((store[key].resetTime - now) / 1000))
      return reply.status(429).send({
        error: message,
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
      })
    }

    // Store rate limit info for potential rollback on successful responses
    if (skipSuccessfulRequests) {
      ;(request as any).rateLimitKey = key
      ;(request as any).rateLimitStore = store
    }
  }
}

/**
 * Response hook to decrement rate limit count for successful requests
 * Only used when skipSuccessfulRequests is true
 */
export async function rateLimitResponseHook(request: any, reply: any) {
  const key = (request as any).rateLimitKey
  const store = (request as any).rateLimitStore
  
  if (key && store && store[key] && reply.statusCode < 400) {
    store[key].count--
  }
}

/**
 * Standard rate limiter for most endpoints
 * 100 requests per 15 minutes per IP
 */
export const standardRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests from this IP, please try again later.',
})

/**
 * Strict rate limiter for auth endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
})

/**
 * Permissive rate limiter for public endpoints
 * 500 requests per 15 minutes per IP
 */
export const publicRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500,
  message: 'Too many requests, please try again later.',
})
