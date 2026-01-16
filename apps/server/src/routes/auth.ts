import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AuthService } from '../services/auth.service.js'
import { authMiddleware, requireRole, extractToken } from '../middleware/auth.js'

/**
 * Request/Response schemas
 */
const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const AuthResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    roles: z.array(z.string()),
    orgId: z.string(),
    verified: z.boolean(),
    active: z.boolean(),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
})

const TokenRefreshSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
})

/**
 * Register auth routes
 */
export async function registerAuthRoutes(
  fastify: FastifyInstance,
  authService: AuthService
) {
  /**
   * POST /api/v1/auth/login
   * Authenticate user with email and password
   */
  fastify.post<{ Body: z.infer<typeof LoginRequestSchema> }>(
    '/api/v1/auth/login',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Validate request
        const validated = LoginRequestSchema.parse(request.body)

        // Authenticate user
        const response = await authService.login(validated.email, validated.password)

        // Set secure refresh token cookie
        reply.setCookie('refreshToken', response.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/api/v1/auth',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })

        // Also set access token cookie for convenience
        reply.setCookie('accessToken', response.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60 * 1000, // 15 minutes
        })

        return reply.status(200).send(response)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            statusCode: 400,
            details: error.errors,
            timestamp: new Date().toISOString(),
          })
        }

        if (error instanceof Error) {
          if (error.message.includes('Invalid') || error.message.includes('invalid')) {
            return reply.status(401).send({
              error: error.message,
              code: 'INVALID_CREDENTIALS',
              statusCode: 401,
              timestamp: new Date().toISOString(),
            })
          }
        }

        fastify.log.error(error)
        return reply.status(500).send({
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post<{ Body: { refreshToken?: string } }>(
    '/api/v1/auth/refresh',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get refresh token from body or cookie
        let refreshToken = (request.body as any)?.refreshToken
        if (!refreshToken) {
          refreshToken = request.cookies?.refreshToken
        }

        if (!refreshToken) {
          return reply.status(401).send({
            error: 'Missing refresh token',
            code: 'MISSING_TOKEN',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          })
        }

        // Refresh tokens
        const tokens = await authService.refresh(refreshToken)

        // Update cookies
        reply.setCookie('accessToken', tokens.accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 15 * 60 * 1000, // 15 minutes
        })

        if (tokens.refreshToken) {
          reply.setCookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/api/v1/auth',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          })
        }

        return reply.status(200).send(tokens)
      } catch (error) {
        if (error instanceof Error) {
          return reply.status(401).send({
            error: error.message,
            code: 'INVALID_TOKEN',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          })
        }

        fastify.log.error(error)
        return reply.status(500).send({
          error: 'Internal server error',
          code: 'SERVER_ERROR',
          statusCode: 500,
          timestamp: new Date().toISOString(),
        })
      }
    }
  )

  /**
   * POST /api/v1/auth/logout
   * Clear session
   */
  fastify.post(
    '/api/v1/auth/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Clear cookies
      reply.clearCookie('accessToken', { path: '/' })
      reply.clearCookie('refreshToken', { path: '/api/v1/auth' })

      return reply.status(200).send({
        message: 'Logged out successfully',
        timestamp: new Date().toISOString(),
      })
    }
  )

  /**
   * GET /api/v1/users/me
   * Get current authenticated user
   */
  fastify.get(
    '/api/v1/users/me',
    { preHandler: authMiddleware },
    async (request: FastifyRequest, reply: FastifyReply) => {
      return reply.status(200).send({
        id: request.user?.userId,
        email: request.user?.email,
        orgId: request.user?.orgId,
        roles: request.user?.roles,
        // Add more user fields as needed
      })
    }
  )
}
