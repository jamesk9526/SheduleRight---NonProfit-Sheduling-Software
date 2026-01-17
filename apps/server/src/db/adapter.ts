import type { ServerScope } from 'nano'
import { randomUUID } from 'crypto'
import type { MySqlPool } from './mysql.js'

export interface FindQuery {
  selector: Record<string, any>
  limit?: number
  sort?: Array<Record<string, 'asc' | 'desc'>>
}

export interface FindResult {
  docs: any[]
}

export interface InsertResult {
  ok: boolean
  id: string
  rev?: string
}

export interface DbAdapter {
  find(query: FindQuery): Promise<FindResult>
  insert(doc: any): Promise<InsertResult>
  get(id: string): Promise<any>
  info(): Promise<{ db_name: string; doc_count: number }>
}

export function createCouchDbAdapter(db: ServerScope | any): DbAdapter {
  return {
    find: (query) => db.find(query),
    insert: (doc) => db.insert(doc),
    get: (id) => db.get(id),
    info: async () => {
      const info = await db.info()
      return {
        db_name: (info as any).db_name || 'couchdb',
        doc_count: (info as any).doc_count || 0,
      }
    },
  }
}

function extractIndexFields(doc: any) {
  const type = doc.type

  const base = {
    id: doc.id || doc._id,
    type,
    org_id: doc.orgId || null,
    site_id: doc.siteId || null,
    email: doc.email || null,
    status: doc.status || null,
    slot_id: doc.slotId || null,
    client_email: doc.clientEmail || null,
    timestamp: doc.timestamp ? new Date(doc.timestamp) : null,
    entity_type: doc.entityType || null,
    entity_id: doc.entityId || null,
    property_id: doc.propertyId || null,
  }

  return base
}

export function createMySqlAdapter(pool: MySqlPool): DbAdapter {
  return {
    async find(query: FindQuery): Promise<FindResult> {
      const { selector, limit, sort } = query
      const where: string[] = []
      const params: any[] = []

      if (selector.type) {
        where.push('type = ?')
        params.push(selector.type)
      }

      for (const [key, value] of Object.entries(selector)) {
        if (key === 'type') continue

        if (key === 'deleted') {
          // CouchDB soft-delete filter not used in MySQL documents table
          continue
        }

        if (typeof value === 'object' && value !== null) {
          if ('$ne' in value) {
            const col = mapSelectorKey(key)
            where.push(`${col} <> ?`)
            params.push(value.$ne)
          } else if ('$in' in value) {
            const col = mapSelectorKey(key)
            const placeholders = value.$in.map((entry: any) => {
              params.push(entry)
              return '?'
            }).join(',')
            where.push(`${col} IN (${placeholders})`)
          } else if ('$gte' in value || '$lte' in value) {
            const col = mapSelectorKey(key)
            if (value.$gte) {
              where.push(`${col} >= ?`)
              params.push(value.$gte)
            }
            if (value.$lte) {
              where.push(`${col} <= ?`)
              params.push(value.$lte)
            }
          }
          continue
        }

        const col = mapSelectorKey(key)
        where.push(`${col} = ?`)
        params.push(value)
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const orderSql = buildOrderBy(sort)
      const limitSql = limit ? `LIMIT ${Number(limit)}` : ''

      const [rows] = await pool.query(
        `SELECT data FROM documents ${whereSql} ${orderSql} ${limitSql}`,
        params
      )

      const docs = (rows as any[]).map((row) => JSON.parse(row.data))
      return { docs }
    },

    async insert(doc: any): Promise<InsertResult> {
      const id = doc.id || doc._id || `${doc.type}:${randomUUID()}`
      doc.id = doc.id || id
      doc._id = doc._id || id
      const now = new Date()
      const createdAt = formatMySqlDateTime(doc.createdAt ?? now)
      const updatedAt = formatMySqlDateTime(doc.updatedAt ?? now)
      const indexFields = extractIndexFields(doc)

      const payload = JSON.stringify(doc)

      await pool.query(
        `INSERT INTO documents
          (id, type, data, org_id, site_id, email, status, slot_id, client_email, timestamp, entity_type, entity_id, property_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          data = VALUES(data),
          org_id = VALUES(org_id),
          site_id = VALUES(site_id),
          email = VALUES(email),
          status = VALUES(status),
          slot_id = VALUES(slot_id),
          client_email = VALUES(client_email),
          timestamp = VALUES(timestamp),
          entity_type = VALUES(entity_type),
          entity_id = VALUES(entity_id),
          property_id = VALUES(property_id),
          updated_at = VALUES(updated_at)`,
        [
          id,
          indexFields.type,
          payload,
          indexFields.org_id,
          indexFields.site_id,
          indexFields.email,
          indexFields.status,
          indexFields.slot_id,
          indexFields.client_email,
          indexFields.timestamp,
          indexFields.entity_type,
          indexFields.entity_id,
          indexFields.property_id,
          createdAt,
          updatedAt,
        ]
      )

      return { ok: true, id }
    },

    async get(id: string): Promise<any> {
      const [rows] = await pool.query('SELECT data FROM documents WHERE id = ? LIMIT 1', [id])
      const row = (rows as any[])[0]
      if (!row) {
        const error = new Error('not_found') as Error & { statusCode?: number }
        error.statusCode = 404
        throw error
      }
      return JSON.parse(row.data)
    },

    async info(): Promise<{ db_name: string; doc_count: number }> {
      const [rows] = await pool.query('SELECT COUNT(*) as count FROM documents')
      const count = (rows as any[])[0]?.count ?? 0
      return { db_name: 'mysql', doc_count: Number(count) }
    },
  }
}

function formatMySqlDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().replace('T', ' ').replace('Z', '')
  }
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

function mapSelectorKey(key: string): string {
  switch (key) {
    case 'orgId':
      return 'org_id'
    case 'siteId':
      return 'site_id'
    case 'clientEmail':
      return 'client_email'
    case 'slotId':
      return 'slot_id'
    case 'bookingId':
      return 'slot_id'
    case 'timestamp':
      return 'timestamp'
    case 'email':
      return 'email'
    case 'status':
      return 'status'
    case 'id':
      return 'id'
    case 'entityType':
      return 'entity_type'
    case 'entityId':
      return 'entity_id'
    case 'propertyId':
      return 'property_id'
    default:
      return key
  }
}

function buildOrderBy(sort?: Array<Record<string, 'asc' | 'desc'>>): string {
  if (!sort || !sort.length) return ''
  const [entry] = sort
  const [field, direction] = Object.entries(entry)[0]
  const col = mapSelectorKey(field)
  return `ORDER BY ${col} ${direction.toUpperCase()}`
}
