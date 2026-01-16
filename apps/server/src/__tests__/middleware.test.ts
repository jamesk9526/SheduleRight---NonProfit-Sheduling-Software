import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware, requireRole, enforceTenancy, extractToken } from '../middleware/auth.js'

// Mock config
vi.mock('../config.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
  },
}))

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn((token: string, secret: string) => {
      if (token === 'valid-token') {
        return {
          userId: 'user:test-001',
          email: 'test@example.com',
          orgId: 'org:test-001',
          roles: ['STAFF'],
        }
      }
      throw new Error('Invalid token')
    }),
  },
}))

describe('Auth Middleware', () => {
  let mockRequest: Partial<FastifyRequest>
  let mockReply: Partial<FastifyReply>

  beforeEach(() => {
    mockRequest = {
      headers: {},
      cookies: {},
    }

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    }
  })

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      mockRequest.headers = {
        authorization: 'Bearer test-token-123',
      }

      const token = extractToken(mockRequest as FastifyRequest)

      expect(token).toBe('test-token-123')
    })

    it('should extract token from cookie', () => {
      mockRequest.cookies = {
        accessToken: 'cookie-token-456',
      }

      const token = extractToken(mockRequest as FastifyRequest)

      expect(token).toBe('cookie-token-456')
    })

    it('should prefer Authorization header over cookie', () => {
      mockRequest.headers = {
        authorization: 'Bearer header-token',
      }
      mockRequest.cookies = {
        accessToken: 'cookie-token',
      }

      const token = extractToken(mockRequest as FastifyRequest)

      expect(token).toBe('header-token')
    })

    it('should return null if no token found', () => {
      const token = extractToken(mockRequest as FastifyRequest)

      expect(token).toBeNull()
    })

    it('should handle malformed Authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      }

      const token = extractToken(mockRequest as FastifyRequest)

      expect(token).toBeNull()
    })
  })

  describe('authMiddleware', () => {
    it('should attach user to request with valid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockRequest.user).toBeTruthy()
      expect(mockRequest.user?.userId).toBe('user:test-001')
      expect(mockRequest.user?.email).toBe('test@example.com')
      expect(mockRequest.user?.orgId).toBe('org:test-001')
    })

    it('should return 401 if no token provided', async () => {
      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required',
          code: 'MISSING_TOKEN',
        })
      )
    })

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      }

      await authMiddleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        })
      )
    })
  })

  describe('requireRole', () => {
    it('should allow user with required role', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }

      const middleware = requireRole('STAFF')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
      expect(mockReply.send).not.toHaveBeenCalled()
    })

    it('should allow user with one of multiple required roles', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }

      const middleware = requireRole('ADMIN', 'STAFF')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should deny user without required role', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['VOLUNTEER'],
      }

      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied: Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
        })
      )
    })

    it('should return 401 if user not authenticated', async () => {
      const middleware = requireRole('ADMIN')
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Authentication required',
          code: 'AUTH_FAILED',
        })
      )
    })
  })

  describe('enforceTenancy', () => {
    it('should allow access to own organization (from params)', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }
      mockRequest.params = {
        orgId: 'org:test-001',
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should allow access to own organization (from body)', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }
      mockRequest.body = {
        orgId: 'org:test-001',
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should deny access to different organization', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }
      mockRequest.params = {
        orgId: 'org:other-org',
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(403)
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Access denied: User can only access their own organization',
          code: 'FORBIDDEN_ORG_ACCESS',
        })
      )
    })

    it('should allow ADMIN to access any organization', async () => {
      mockRequest.user = {
        userId: 'user:admin-001',
        email: 'admin@example.com',
        orgId: 'org:test-001',
        roles: ['ADMIN'],
      }
      mockRequest.params = {
        orgId: 'org:other-org',
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should pass through if no orgId in request', async () => {
      mockRequest.user = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).not.toHaveBeenCalled()
    })

    it('should return 401 if user not authenticated', async () => {
      mockRequest.params = {
        orgId: 'org:test-001',
      }

      const middleware = enforceTenancy()
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply)

      expect(mockReply.status).toHaveBeenCalledWith(401)
    })
  })
})
