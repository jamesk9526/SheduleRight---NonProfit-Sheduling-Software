import type { ServerScope } from 'nano'
import { randomUUID } from 'crypto'

/**
 * Audit Log Entry
 */
export interface AuditLog {
  _id: string
  type: 'audit'
  id: string
  action: string
  userId: string
  orgId: string
  resourceType: string
  resourceId: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

/**
 * Audit Service
 * Creates immutable audit trail for important operations
 */
export function createAuditService(db: ServerScope) {
  /**
   * Create an audit log entry
   */
  async function createAuditLog(data: {
    action: string
    userId: string
    orgId: string
    resourceType: string
    resourceId: string
    details?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }): Promise<AuditLog> {
    const auditId = `audit:${randomUUID()}`
    const now = new Date().toISOString()

    const auditLog: AuditLog = {
      _id: auditId,
      type: 'audit',
      id: auditId,
      action: data.action,
      userId: data.userId,
      orgId: data.orgId,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      details: data.details,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      timestamp: now,
    }

    try {
      await db.insert(auditLog)
      return auditLog
    } catch (error) {
      // Log error but don't fail the request
      console.error('Failed to create audit log:', error)
      throw error
    }
  }

  /**
   * Query audit logs
   */
  async function getAuditLogs(filters: {
    orgId?: string
    userId?: string
    action?: string
    resourceType?: string
    resourceId?: string
    startDate?: string
    endDate?: string
    limit?: number
  }): Promise<AuditLog[]> {
    try {
      const selector: any = {
        type: 'audit',
      }

      if (filters.orgId) selector.orgId = filters.orgId
      if (filters.userId) selector.userId = filters.userId
      if (filters.action) selector.action = filters.action
      if (filters.resourceType) selector.resourceType = filters.resourceType
      if (filters.resourceId) selector.resourceId = filters.resourceId

      if (filters.startDate || filters.endDate) {
        selector.timestamp = {}
        if (filters.startDate) selector.timestamp.$gte = filters.startDate
        if (filters.endDate) selector.timestamp.$lte = filters.endDate
      }

      const result = await db.find({
        selector,
        sort: [{ timestamp: 'desc' }],
        limit: filters.limit || 100,
      })

      return result.docs as AuditLog[]
    } catch (error) {
      console.error('Failed to query audit logs:', error)
      throw new Error('Failed to retrieve audit logs')
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async function getResourceAuditTrail(
    resourceType: string,
    resourceId: string
  ): Promise<AuditLog[]> {
    return getAuditLogs({ resourceType, resourceId, limit: 50 })
  }

  return {
    createAuditLog,
    getAuditLogs,
    getResourceAuditTrail,
  }
}

export type AuditService = ReturnType<typeof createAuditService>

/**
 * Common audit actions
 */
export const AuditActions = {
  // Authentication
  LOGIN: 'user.login',
  LOGOUT: 'user.logout',
  LOGIN_FAILED: 'user.login.failed',
  
  // Organizations
  ORG_CREATE: 'org.create',
  ORG_UPDATE: 'org.update',
  ORG_DELETE: 'org.delete',
  
  // Sites
  SITE_CREATE: 'site.create',
  SITE_UPDATE: 'site.update',
  SITE_DELETE: 'site.delete',
  
  // Bookings
  BOOKING_CREATE: 'booking.create',
  BOOKING_CONFIRM: 'booking.confirm',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_COMPLETE: 'booking.complete',
  BOOKING_NO_SHOW: 'booking.no_show',
  
  // Availability
  AVAILABILITY_CREATE: 'availability.create',
  AVAILABILITY_UPDATE: 'availability.update',
  AVAILABILITY_DEACTIVATE: 'availability.deactivate',
  
  // Users
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role.change',

  // Embed configs
  EMBED_CONFIG_CREATE: 'embed.config.create',
  EMBED_CONFIG_UPDATE: 'embed.config.update',
  EMBED_CONFIG_ARCHIVE: 'embed.config.archive',
} as const
