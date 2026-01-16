import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAuthService } from '../services/auth.service.js'
import jwt from 'jsonwebtoken'

// Mock config
vi.mock('../config.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiry: '15m',
    jwtRefreshExpiry: '30d',
  },
}))

describe('Auth Service', () => {
  // Mock database
  const mockDb = {
    find: vi.fn(),
    insert: vi.fn(),
  }

  const authService = createAuthService(mockDb as any)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const user = {
        id: 'user:test-001',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['STAFF'],
        orgId: 'org:test-001',
        verified: true,
        active: true,
      }

      const tokens = authService.generateTokens(user)

      expect(tokens).toHaveProperty('accessToken')
      expect(tokens).toHaveProperty('refreshToken')
      expect(typeof tokens.accessToken).toBe('string')
      expect(typeof tokens.refreshToken).toBe('string')

      // Verify token contains correct data
      const decoded = jwt.verify(tokens.accessToken, 'test-secret-key') as any
      expect(decoded.userId).toBe(user.id)
      expect(decoded.email).toBe(user.email)
      expect(decoded.orgId).toBe(user.orgId)
      expect(decoded.roles).toEqual(user.roles)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const payload = {
        userId: 'user:test-001',
        email: 'test@example.com',
        orgId: 'org:test-001',
        roles: ['STAFF'],
      }

      const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '15m' })
      const verified = authService.verifyToken(token)

      expect(verified).toBeTruthy()
      expect(verified.userId).toBe(payload.userId)
      expect(verified.email).toBe(payload.email)
    })

    it('should return null for invalid token', () => {
      const verified = authService.verifyToken('invalid-token')
      expect(verified).toBeNull()
    })

    it('should return null for expired token', () => {
      const payload = { userId: 'user:test-001' }
      const token = jwt.sign(payload, 'test-secret-key', { expiresIn: '0s' })
      
      // Wait a bit to ensure expiration
      const verified = authService.verifyToken(token)
      expect(verified).toBeNull()
    })
  })

  describe('hashPassword', () => {
    it('should hash password (base64 MVP)', () => {
      const password = 'testPassword123'
      const hashed = authService.hashPassword(password)

      expect(hashed).toBeTruthy()
      expect(hashed).not.toBe(password)
      expect(hashed).toBe(Buffer.from(password).toString('base64'))
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching passwords', () => {
      const password = 'testPassword123'
      const hashed = authService.hashPassword(password)

      const result = authService.comparePassword(password, hashed)
      expect(result).toBe(true)
    })

    it('should return false for non-matching passwords', () => {
      const password = 'testPassword123'
      const hashed = authService.hashPassword(password)

      const result = authService.comparePassword('wrongPassword', hashed)
      expect(result).toBe(false)
    })
  })

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const user = {
        _id: 'user:test-001',
        type: 'user',
        id: 'user:test-001',
        email: 'test@example.com',
        name: 'Test User',
        password: authService.hashPassword('testPassword123'),
        roles: ['STAFF'],
        orgId: 'org:test-001',
        verified: true,
        active: true,
      }

      mockDb.find.mockResolvedValue({
        docs: [user],
      })

      const result = await authService.login('test@example.com', 'testPassword123')

      expect(result).toBeTruthy()
      expect(result.user.email).toBe(user.email)
      expect(result.user.id).toBe(user.id)
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(mockDb.find).toHaveBeenCalledWith({
        selector: {
          type: 'user',
          email: 'test@example.com',
        },
        limit: 1,
      })
    })

    it('should throw error for non-existent user', async () => {
      mockDb.find.mockResolvedValue({
        docs: [],
      })

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid email or password')
    })

    it('should throw error for wrong password', async () => {
      const user = {
        _id: 'user:test-001',
        email: 'test@example.com',
        password: authService.hashPassword('correctPassword'),
        roles: ['STAFF'],
        orgId: 'org:test-001',
      }

      mockDb.find.mockResolvedValue({
        docs: [user],
      })

      await expect(
        authService.login('test@example.com', 'wrongPassword')
      ).rejects.toThrow('Invalid email or password')
    })
  })

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = {
        _id: 'user:test-001',
        type: 'user',
        id: 'user:test-001',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['STAFF'],
        orgId: 'org:test-001',
        verified: true,
        active: true,
      }

      // Create valid refresh token
      const refreshToken = jwt.sign(
        { userId: user.id },
        'test-secret-key',
        { expiresIn: '30d' }
      )

      mockDb.find.mockResolvedValue({
        docs: [user],
      })

      const result = await authService.refresh(refreshToken)

      expect(result).toBeTruthy()
      expect(result.accessToken).toBeTruthy()
      expect(result.refreshToken).toBeTruthy()
      expect(mockDb.find).toHaveBeenCalledWith({
        selector: {
          type: 'user',
          id: user.id,
        },
        limit: 1,
      })
    })

    it('should throw error for invalid refresh token', async () => {
      await expect(
        authService.refresh('invalid-token')
      ).rejects.toThrow('Invalid refresh token')
    })

    it('should throw error if user not found', async () => {
      const refreshToken = jwt.sign(
        { userId: 'user:nonexistent' },
        'test-secret-key',
        { expiresIn: '30d' }
      )

      mockDb.find.mockResolvedValue({
        docs: [],
      })

      await expect(
        authService.refresh(refreshToken)
      ).rejects.toThrow('User not found')
    })
  })

  describe('createUser', () => {
    it('should create new user with hashed password', async () => {
      const userData = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'password123',
        roles: ['CLIENT'],
        orgId: 'org:test-001',
      }

      mockDb.find.mockResolvedValue({ docs: [] }) // No existing user
      mockDb.insert.mockResolvedValue({ ok: true, id: 'user:new-001', rev: '1-xxx' })

      const result = await authService.createUser(userData)

      expect(result).toBeTruthy()
      expect(result.id).toContain('user:')
      expect(result.email).toBe(userData.email)
      expect(result.password).not.toBe(userData.password) // Should be hashed
      expect(mockDb.insert).toHaveBeenCalled()

      const insertCall = mockDb.insert.mock.calls[0][0]
      expect(insertCall.email).toBe(userData.email)
      expect(insertCall.type).toBe('user')
    })

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Existing User',
        password: 'password123',
        roles: ['CLIENT'],
        orgId: 'org:test-001',
      }

      mockDb.find.mockResolvedValue({
        docs: [{ email: 'existing@example.com' }],
      })

      await expect(
        authService.createUser(userData)
      ).rejects.toThrow('User with this email already exists')
    })
  })
})
