import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify'
import { logger } from '../logger.js'
import { ZodError } from 'zod'

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  statusCode = 400
  code = 'VALIDATION_ERROR'
  
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401
  code = 'UNAUTHORIZED'
  
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  code = 'FORBIDDEN'
  
  constructor(message: string = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends Error {
  statusCode = 404
  code = 'NOT_FOUND'
  
  constructor(message: string = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  statusCode = 409
  code = 'CONFLICT'
  
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

/**
 * Map error to HTTP status code and error response
 */
function mapError(error: Error | FastifyError | any) {
  // Custom application errors
  if (error instanceof ValidationError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      details: error.details,
    }
  }

  if (error instanceof UnauthorizedError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof ForbiddenError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof NotFoundError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    }
  }

  if (error instanceof ConflictError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    }
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      })),
    }
  }

  // Fastify errors
  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      code: error.code || 'ERROR',
      message: error.message,
    }
  }

  // Generic errors (500)
  return {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
  }
}

/**
 * Global Error Handler
 * Catches all errors, logs them, and returns sanitized responses
 */
export function errorHandler(
  error: Error | FastifyError | any,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const requestId = request.headers['x-request-id'] as string
  const mapped = mapError(error)

  // Log error with context
  const logData = {
    requestId,
    method: request.method,
    url: request.url,
    statusCode: mapped.statusCode,
    errorCode: mapped.code,
    errorMessage: mapped.message,
    userId: (request as any).user?.id,
    orgId: (request as any).user?.orgId,
  }

  // Log level based on status code
  if (mapped.statusCode >= 500) {
    logger.error({
      ...logData,
      err: error, // Include full error for 500s
      stack: error.stack,
    }, 'Server error')
  } else if (mapped.statusCode >= 400) {
    logger.warn(logData, 'Client error')
  }

  // Send sanitized error response
  const response: any = {
    error: mapped.message,
    code: mapped.code,
    statusCode: mapped.statusCode,
    timestamp: new Date().toISOString(),
    requestId,
  }

  // Include details for validation errors
  if (mapped.details) {
    response.details = mapped.details
  }

  // Only include stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack
  }

  reply.status(mapped.statusCode).send(response)
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and forwards to error handler
 */
export function asyncHandler(
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<any>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      return await handler(request, reply)
    } catch (error) {
      errorHandler(error as Error, request, reply)
    }
  }
}
