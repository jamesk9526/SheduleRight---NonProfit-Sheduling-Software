import type { FastifyRequest, FastifyReply } from 'fastify'
import { config } from '../config.js'

/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP requests to HTTPS in production
 */
export async function httpsEnforcement(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Only enforce HTTPS in production
  if (config.nodeEnv !== 'production') {
    return
  }

  // Check if request is already HTTPS
  const isHttps = request.protocol === 'https' || request.headers['x-forwarded-proto'] === 'https'

  if (!isHttps) {
    const httpsUrl = `https://${request.hostname}${request.url}`
    return reply.redirect(301, httpsUrl)
  }
}

/**
 * Security Headers Configuration
 * Additional headers beyond what helmet provides
 */
export async function securityHeaders(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Prevent MIME type sniffing
  reply.header('X-Content-Type-Options', 'nosniff')

  // Enable XSS protection
  reply.header('X-XSS-Protection', '1; mode=block')

  // Prevent clickjacking
  reply.header('X-Frame-Options', 'DENY')

  // Referrer policy
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (formerly Feature-Policy)
  reply.header(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  )

  // HSTS (HTTP Strict Transport Security) - only in production
  if (config.nodeEnv === 'production') {
    reply.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
}

/**
 * Request ID Middleware
 * Adds unique request ID for tracing
 */
export async function requestId(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] || crypto.randomUUID()
  request.headers['x-request-id'] = requestId as string
  reply.header('X-Request-ID', requestId as string)
}
