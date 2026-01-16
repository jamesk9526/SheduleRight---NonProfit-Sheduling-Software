import type { FastifyRequest, FastifyReply } from 'fastify'
import { logger } from '../logger.js'

/**
 * Request Logger Middleware - onRequest hook
 * Logs incoming requests and stores start time
 */
export async function requestLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] as string
  const startTime = Date.now()

  // Store start time for response logging
  ;(request as any).startTime = startTime

  // Create child logger with request context
  const reqLogger = logger.child({
    requestId,
    method: request.method,
    url: request.url,
    userAgent: request.headers['user-agent'],
    ip: request.ip,
    userId: (request as any).user?.id,
    orgId: (request as any).user?.orgId,
  })

  // Log incoming request
  reqLogger.info({
    type: 'request',
    msg: `→ ${request.method} ${request.url}`,
  })

  // Attach logger to request for use in handlers and response hook
  ;(request as any).logger = reqLogger
}

/**
 * Response Logger Middleware - onResponse hook
 * Logs responses with duration and status
 */
export async function responseLogger(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const startTime = (request as any).startTime || Date.now()
  const duration = Date.now() - startTime
  const statusCode = reply.statusCode
  const reqLogger = (request as any).logger || logger

  const logData = {
    type: 'response',
    statusCode,
    duration,
    msg: `← ${request.method} ${request.url} ${statusCode} ${duration}ms`,
  }

  // Log level based on status code
  if (statusCode >= 500) {
    reqLogger.error(logData)
  } else if (statusCode >= 400) {
    reqLogger.warn(logData)
  } else {
    reqLogger.info(logData)
  }

  // Flag slow requests
  if (duration > 1000) {
    reqLogger.warn({
      type: 'slow_request',
      duration,
      msg: `Slow request: ${request.method} ${request.url} took ${duration}ms`,
    })
  }
}
