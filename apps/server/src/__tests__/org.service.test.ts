import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createOrgService } from '../services/org.service.js'

describe('Org Service', () => {
  // Mock database
  const mockDb = {
    find: vi.fn(),
    insert: vi.fn(),
  }

  const orgService = createOrgService(mockDb as any)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listOrgs', () => {
    it('should return all organizations', async () => {
      const mockOrgs = [
        {
          _id: 'org:001',
          type: 'org',
          id: 'org:001',
          name: 'Test Org 1',
          tenantId: 'tenant:001',
          settings: { timezone: 'US/Eastern' },
        },
        {
          _id: 'org:002',
          type: 'org',
          id: 'org:002',
          name: 'Test Org 2',
          tenantId: 'tenant:002',
          settings: { timezone: 'US/Pacific' },
        },
      ]

      mockDb.find.mockResolvedValue({
        docs: mockOrgs,
      })

      const result = await orgService.listOrgs()

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Test Org 1')
      expect(result[1].name).toBe('Test Org 2')
      expect(mockDb.find).toHaveBeenCalledWith({
        selector: { type: 'org' },
        limit: 1000,
      })
    })

    it('should return empty array if no orgs', async () => {
      mockDb.find.mockResolvedValue({ docs: [] })

      const result = await orgService.listOrgs()

      expect(result).toHaveLength(0)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle database errors', async () => {
      mockDb.find.mockRejectedValue(new Error('Database error'))

      await expect(orgService.listOrgs()).rejects.toThrow(
        'Failed to retrieve organizations'
      )
    })
  })

  describe('getOrgById', () => {
    it('should return organization by id', async () => {
      const mockOrg = {
        _id: 'org:001',
        type: 'org',
        id: 'org:001',
        name: 'Test Org',
        tenantId: 'tenant:001',
        settings: { timezone: 'US/Eastern' },
      }

      mockDb.find.mockResolvedValue({
        docs: [mockOrg],
      })

      const result = await orgService.getOrgById('org:001')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('org:001')
      expect(result?.name).toBe('Test Org')
      expect(mockDb.find).toHaveBeenCalledWith({
        selector: { type: 'org', id: 'org:001' },
        limit: 1,
      })
    })

    it('should return null if org not found', async () => {
      mockDb.find.mockResolvedValue({ docs: [] })

      const result = await orgService.getOrgById('org:nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createOrg', () => {
    it('should create new organization', async () => {
      const orgData = {
        name: 'New Community Center',
        settings: {
          timezone: 'US/Pacific',
        },
      }

      mockDb.insert.mockResolvedValue({
        ok: true,
        id: 'org:new-001',
        rev: '1-xxx',
      })

      const result = await orgService.createOrg(orgData)

      expect(result).toBeTruthy()
      expect(result.name).toBe(orgData.name)
      expect(result.settings.timezone).toBe('US/Pacific')
      expect(result.id).toContain('org:')
      expect(result.tenantId).toContain('tenant:')
      expect(result.createdAt).toBeTruthy()
      expect(result.updatedAt).toBeTruthy()

      const insertCall = mockDb.insert.mock.calls[0][0]
      expect(insertCall.type).toBe('org')
      expect(insertCall.name).toBe(orgData.name)
    })

    it('should auto-generate tenantId if not provided', async () => {
      const orgData = {
        name: 'Test Org',
        settings: { timezone: 'UTC' },
      }

      mockDb.insert.mockResolvedValue({
        ok: true,
        id: 'org:001',
        rev: '1-xxx',
      })

      const result = await orgService.createOrg(orgData)

      expect(result.tenantId).toContain('tenant:')
    })

    it('should use provided tenantId', async () => {
      const orgData = {
        name: 'Test Org',
        tenantId: 'tenant:custom-001',
        settings: { timezone: 'UTC' },
      }

      mockDb.insert.mockResolvedValue({
        ok: true,
        id: 'org:001',
        rev: '1-xxx',
      })

      const result = await orgService.createOrg(orgData)

      expect(result.tenantId).toBe('tenant:custom-001')
    })

    it('should handle insert failure', async () => {
      mockDb.insert.mockRejectedValue(new Error('Insert failed'))

      await expect(
        orgService.createOrg({
          name: 'Test',
          settings: { timezone: 'UTC' },
        })
      ).rejects.toThrow('Failed to create organization')
    })
  })

  describe('listSites', () => {
    it('should return all sites for an organization', async () => {
      const mockSites = [
        {
          _id: 'site:001',
          type: 'site',
          id: 'site:001',
          orgId: 'org:001',
          name: 'Main Campus',
          timezone: 'US/Eastern',
        },
        {
          _id: 'site:002',
          type: 'site',
          id: 'site:002',
          orgId: 'org:001',
          name: 'Downtown Branch',
          timezone: 'US/Eastern',
        },
      ]

      mockDb.find.mockResolvedValue({
        docs: mockSites,
      })

      const result = await orgService.listSites('org:001')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('Main Campus')
      expect(result[1].name).toBe('Downtown Branch')
      expect(mockDb.find).toHaveBeenCalledWith({
        selector: { type: 'site', orgId: 'org:001' },
        limit: 1000,
      })
    })

    it('should return empty array if no sites', async () => {
      mockDb.find.mockResolvedValue({ docs: [] })

      const result = await orgService.listSites('org:001')

      expect(result).toHaveLength(0)
    })
  })

  describe('getSiteById', () => {
    it('should return site by id', async () => {
      const mockSite = {
        _id: 'site:001',
        type: 'site',
        id: 'site:001',
        orgId: 'org:001',
        name: 'Main Campus',
        timezone: 'US/Eastern',
      }

      mockDb.find.mockResolvedValue({
        docs: [mockSite],
      })

      const result = await orgService.getSiteById('site:001')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('site:001')
      expect(result?.name).toBe('Main Campus')
    })

    it('should return null if site not found', async () => {
      mockDb.find.mockResolvedValue({ docs: [] })

      const result = await orgService.getSiteById('site:nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createSite', () => {
    it('should create new site', async () => {
      const siteData = {
        name: 'New Branch',
        address: '123 Main St',
        timezone: 'US/Pacific',
      }

      mockDb.insert.mockResolvedValue({
        ok: true,
        id: 'site:new-001',
        rev: '1-xxx',
      })

      const result = await orgService.createSite('org:001', siteData)

      expect(result).toBeTruthy()
      expect(result.name).toBe(siteData.name)
      expect(result.address).toBe(siteData.address)
      expect(result.timezone).toBe(siteData.timezone)
      expect(result.orgId).toBe('org:001')
      expect(result.id).toContain('site:')

      const insertCall = mockDb.insert.mock.calls[0][0]
      expect(insertCall.type).toBe('site')
      expect(insertCall.orgId).toBe('org:001')
    })

    it('should create site without address', async () => {
      const siteData = {
        name: 'Virtual Site',
        timezone: 'UTC',
      }

      mockDb.insert.mockResolvedValue({
        ok: true,
        id: 'site:001',
        rev: '1-xxx',
      })

      const result = await orgService.createSite('org:001', siteData)

      expect(result.name).toBe('Virtual Site')
      expect(result.address).toBeUndefined()
    })

    it('should handle insert failure', async () => {
      mockDb.insert.mockRejectedValue(new Error('Insert failed'))

      await expect(
        orgService.createSite('org:001', {
          name: 'Test',
          timezone: 'UTC',
        })
      ).rejects.toThrow('Failed to create site')
    })
  })

  describe('Validation', () => {
    it('should validate org name length', async () => {
      const shortName = { name: 'AB', settings: { timezone: 'UTC' } }
      
      await expect(orgService.createOrg(shortName as any)).rejects.toThrow()
    })

    it('should validate site name length', async () => {
      const shortName = { name: 'AB', timezone: 'UTC' }
      
      await expect(
        orgService.createSite('org:001', shortName as any)
      ).rejects.toThrow()
    })
  })
})
