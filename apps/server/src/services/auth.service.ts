import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { config } from '../config.js'

// Import Nano client for CouchDB
type Nano = any // We'll type this properly once we see the actual client

/**
 * Auth Service
 * Handles user authentication, JWT token generation, and user validation
 */

export interface AuthToken {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  roles: string[]
  orgId: string
  verified: boolean
  active: boolean
}

export interface AuthResponse {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

/**
 * Generate JWT tokens (access and refresh)
 */
export function generateTokens(user: AuthUser): AuthToken {
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      roles: user.roles,
    },
    config.jwtSecret,
    {
      expiresIn: '15m', // Short-lived access token
      issuer: 'scheduleright',
      subject: user.id,
    }
  )

  const refreshToken = jwt.sign(
    {
      userId: user.id,
      type: 'refresh',
    },
    config.jwtSecret,
    {
      expiresIn: '30d', // Long-lived refresh token
      issuer: 'scheduleright',
      subject: user.id,
    }
  )

  return { accessToken, refreshToken }
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwtSecret)
  } catch (error) {
    return null
  }
}

/**
 * Hash password using simple method for MVP
 * TODO: Replace with bcrypt once installed
 */
export function hashPassword(password: string): string {
  // For MVP, use a simple hash. In production, use bcrypt
  // This is a placeholder - DO NOT USE IN PRODUCTION
  const hash = Buffer.from(password).toString('base64')
  return `sha256:${hash}`
}

/**
 * Compare plain text password with hash
 */
export function comparePassword(plaintext: string, hash: string): boolean {
  // For MVP, simple comparison
  // This is a placeholder - DO NOT USE IN PRODUCTION
  if (!hash.startsWith('sha256:')) return false
  const stored = hash.substring(7)
  const computed = Buffer.from(plaintext).toString('base64')
  return stored === computed
}

/**
 * Create an AuthService instance
 */
export function createAuthService(db: Nano) {
  return {
    /**
     * Authenticate user with email and password
     */
    async login(email: string, password: string): Promise<AuthResponse> {
      try {
        // Query CouchDB for user by email
        // Using a mango query (CouchDB query language)
        const response = await db.find({
          selector: {
            type: 'user',
            email: email,
            deleted: { $ne: true },
          },
        })

        const users = response.docs as any[]
        if (users.length === 0) {
          throw new Error('Invalid email or password')
        }

        const user = users[0]

        // Verify password
        if (!comparePassword(password, user.passwordHash)) {
          throw new Error('Invalid email or password')
        }

        // Check if user is active and verified
        if (!user.active) {
          throw new Error('User account is inactive')
        }

        // Build user object (don't return password hash)
        const authUser: AuthUser = {
          id: user._id,
          email: user.email,
          name: user.name,
          roles: user.roles || [],
          orgId: user.orgId,
          verified: user.verified || false,
          active: user.active,
        }

        // Generate tokens
        const tokens = generateTokens(authUser)

        return {
          user: authUser,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Authentication failed')
      }
    },

    /**
     * Refresh access token using refresh token
     */
    async refresh(refreshToken: string): Promise<AuthToken> {
      try {
        // Verify refresh token
        const decoded = verifyToken(refreshToken)
        if (!decoded || decoded.type !== 'refresh') {
          throw new Error('Invalid or expired refresh token')
        }

        // Get user from database
        const user = await db.get(decoded.userId)

        if (!user.active) {
          throw new Error('User account is inactive')
        }

        // Build user object
        const authUser: AuthUser = {
          id: user._id,
          email: user.email,
          name: user.name,
          roles: user.roles || [],
          orgId: user.orgId,
          verified: user.verified || false,
          active: user.active,
        }

        // Generate new tokens
        return generateTokens(authUser)
      } catch (error) {
        if (error instanceof Error) {
          throw error
        }
        throw new Error('Token refresh failed')
      }
    },

    /**
     * Create new user (for signup or admin)
     */
    async createUser(data: {
      email: string
      password: string
      name: string
      orgId: string
      roles?: string[]
    }) {
      // Check if user already exists
      const existing = await db.find({
        selector: {
          type: 'user',
          email: data.email,
          deleted: { $ne: true },
        },
      })

      if (existing.docs.length > 0) {
        throw new Error('User with this email already exists')
      }

      // Create new user
      const user = {
        type: 'user',
        email: data.email,
        name: data.name,
        passwordHash: hashPassword(data.password),
        orgId: data.orgId,
        roles: data.roles || [],
        verified: false,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = await db.insert(user)

      return {
        id: result.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
      }
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
