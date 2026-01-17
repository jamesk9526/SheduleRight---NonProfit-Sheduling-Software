import type { FastifyRequest, FastifyReply } from 'fastify'
import type { DbAdapter } from '../db/adapter.js'

/**
 * Extracts subdomain from hostname
 * Examples:
 * - org1.scheduleright.com -> org1
 * - org1.scheduleright.local -> org1
 * - scheduleright.com -> null (no subdomain)
 * - localhost:3000 -> null (no subdomain)
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0]

  // Handle localhost and IP addresses
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host)
  ) {
    return null
  }

  // Split by dots
  const parts = host.split('.')

  // For subdomains, we expect at least 3 parts: subdomain.domain.tld
  // e.g., org1.scheduleright.com -> 3 parts
  if (parts.length < 3) {
    return null
  }

  // Return the first part as subdomain
  return parts[0]
}

/**
 * Finds organization by subdomain from database
 * Stores subdomain org context in the request for later use
 */
export async function createSubdomainMiddleware(dbAdapter: DbAdapter) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const hostname = request.hostname || request.headers.host || ''
    const subdomain = extractSubdomain(hostname)

    if (!subdomain) {
      // No subdomain, continue without setting org context
      return
    }

    try {
      // Look up organization by subdomain
      const result = await dbAdapter.find({
        selector: {
          type: 'organization',
          subdomain: subdomain,
        },
        limit: 1,
      })

      if (result.docs.length > 0) {
        const org = result.docs[0] as any
        // Store the organization ID in the request for use in other middleware/routes
        ;(request as any).subdomainOrgId = org._id || org.id
      }
    } catch (error) {
      // Log but don't fail the request
      console.error(`Failed to lookup organization for subdomain: ${subdomain}`, error)
    }
  }
}

/**
 * Middleware hook to override orgId from subdomain if present
 * Call this after authentication middleware
 */
export function overrideOrgFromSubdomain() {
  return (request: FastifyRequest) => {
    const subdomainOrgId = (request as any).subdomainOrgId
    if (subdomainOrgId && request.user) {
      // Override the user's orgId with the subdomain's org
      // This ensures users accessing via subdomain only see that org's data
      request.user.orgId = subdomainOrgId
    }
  }
}

/**
 * Ensure organization subdomain is unique before saving
 */
export async function validateSubdomainUniqueness(
  dbAdapter: DbAdapter,
  subdomain: string,
  excludeOrgId?: string
): Promise<boolean> {
  if (!subdomain || subdomain.length < 2) {
    return false
  }

  // Check if subdomain follows allowed pattern (alphanumeric and hyphens)
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(subdomain)) {
    return false
  }

  try {
    const result = await dbAdapter.find({
      selector: {
        type: 'organization',
        subdomain: subdomain,
      },
      limit: 1,
    })

    if (result.docs.length === 0) {
      return true
    }

    // If found, check if it's the same org (for updates)
    if (excludeOrgId && result.docs[0]._id === excludeOrgId) {
      return true
    }

    return false
  } catch (error) {
    console.error(`Failed to validate subdomain: ${subdomain}`, error)
    return false
  }
}
