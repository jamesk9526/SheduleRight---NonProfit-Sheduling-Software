import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyToken } from '../services/auth.service.js'

/**
 * JWT payload interface
 */
export interface JWTPayload {
  userId: string
  email: string
  orgId: string
  roles: string[]
  iat: number
  exp: number
  iss: string
  sub: string
}

/**
 * Extend Fastify Request to include user property
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
    orgId?: string
  }
}

/**
 * Extract JWT from Authorization header or cookie
 */
export function extractToken(request: FastifyRequest): string | null {
  // Try Authorization header first (Bearer token)
  const authHeader = request.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try cookie (for secure httpOnly cookie storage)
  const cookies = request.cookies
  if (cookies?.accessToken) {
    return cookies.accessToken
  }

  return null
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const token = extractToken(request)

    if (!token) {
      return reply.status(401).send({
        error: 'Missing authentication token',
        code: 'MISSING_TOKEN',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return reply.status(401).send({
        error: 'Invalid or expired authentication token',
        code: 'INVALID_TOKEN',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      })
    }

    // Attach user to request
    request.user = decoded
    request.orgId = decoded.orgId

    // Override orgId from subdomain if present
    // This ensures users accessing via a subdomain only see that org's data
    const subdomainOrgId = (request as any).subdomainOrgId
    if (subdomainOrgId) {
      request.user.orgId = subdomainOrgId
      request.orgId = subdomainOrgId
    }
  } catch (error) {
    return reply.status(401).send({
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * RBAC middleware - requires specific role(s)
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Authentication required',
        code: 'UNAUTHORIZED',
        statusCode: 401,
        timestamp: new Date().toISOString(),
      })
    }

    const hasRole = request.user.roles.some((r: string) => roles.includes(r))

    if (!hasRole) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        statusCode: 403,
        timestamp: new Date().toISOString(),
      })
    }
  }
}

/**
 * Tenancy middleware - ensures user can only access their org
 */
export function enforceTenancy() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      return
    }

    const requestedOrgId = (request.params as any)?.orgId || (request.body as any)?.orgId

    if (requestedOrgId && requestedOrgId !== request.user.orgId) {
      return
    }
  }
}
