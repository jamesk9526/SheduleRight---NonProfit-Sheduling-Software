import nano from 'nano'
import { config } from '../config.js'

/**
 * Database Indexes
 * Creates indexes for common queries to improve performance
 */

interface IndexDefinition {
  name: string
  fields: string[]
  ddoc?: string
}

const indexes: IndexDefinition[] = [
  // Organization indexes
  {
    name: 'org-by-type',
    fields: ['type', 'id'],
    ddoc: 'org-indexes',
  },
  {
    name: 'org-by-name',
    fields: ['type', 'name'],
    ddoc: 'org-indexes',
  },

  // Site indexes
  {
    name: 'site-by-org',
    fields: ['type', 'orgId', 'id'],
    ddoc: 'site-indexes',
  },

  // User indexes
  {
    name: 'user-by-email',
    fields: ['type', 'email'],
    ddoc: 'user-indexes',
  },
  {
    name: 'user-by-org',
    fields: ['type', 'orgId', 'email'],
    ddoc: 'user-indexes',
  },

  // Availability indexes
  {
    name: 'availability-by-site',
    fields: ['type', 'siteId', 'status', 'startTime'],
    ddoc: 'availability-indexes',
  },
  {
    name: 'availability-by-status',
    fields: ['type', 'siteId', 'status'],
    ddoc: 'availability-indexes',
  },

  // Booking indexes
  {
    name: 'booking-by-site',
    fields: ['type', 'siteId', 'status', 'createdAt'],
    ddoc: 'booking-indexes',
  },
  {
    name: 'booking-by-status',
    fields: ['type', 'siteId', 'status'],
    ddoc: 'booking-indexes',
  },
  {
    name: 'booking-by-client',
    fields: ['type', 'clientEmail', 'createdAt'],
    ddoc: 'booking-indexes',
  },
  {
    name: 'booking-by-slot',
    fields: ['type', 'slotId', 'status'],
    ddoc: 'booking-indexes',
  },
]

/**
 * Create indexes in CouchDB
 */
export async function createIndexes() {
  console.log('🔍 Creating database indexes...\n')

  try {
    const dbClient = nano({
      url: config.couchdbUrl,
      requestDefaults: {
        auth: {
          username: config.couchdbUser,
          password: config.couchdbPassword,
        },
      },
    })
    const db = dbClient.use('scheduleright')

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const indexDef of indexes) {
      try {
        const indexRequest = {
          index: {
            fields: indexDef.fields,
          },
          name: indexDef.name,
          ddoc: indexDef.ddoc,
          type: 'json',
        }

        const result = await db.createIndex(indexRequest)

        if (result.result === 'created') {
          console.log(`  ✓ Created index: ${indexDef.name} on [${indexDef.fields.join(', ')}]`)
          successCount++
        } else if (result.result === 'exists') {
          console.log(`  ⊙ Index exists: ${indexDef.name}`)
          skipCount++
        }
      } catch (error) {
        console.error(`  ✗ Failed to create index ${indexDef.name}:`, error instanceof Error ? error.message : error)
        errorCount++
      }
    }

    console.log('\n📊 Index Creation Summary:')
    console.log(`  Created: ${successCount}`)
    console.log(`  Exists:  ${skipCount}`)
    console.log(`  Errors:  ${errorCount}`)
    console.log(`  Total:   ${indexes.length}`)

    if (errorCount === 0) {
      console.log('\n✅ All indexes created successfully!')
    } else {
      console.log('\n⚠️ Some indexes failed to create. Check errors above.')
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Fatal error creating indexes:', error)
    // Do not exit when imported; let caller decide
    throw error
  }
}

/**
 * List all indexes in the database
 */
export async function listIndexes() {
  try {
    const dbClient = nano({
      url: config.couchdbUrl,
      requestDefaults: {
        auth: {
          username: config.couchdbUser,
          password: config.couchdbPassword,
        },
      },
    })
    const db = dbClient.use('scheduleright')

    const result = await db.listIndex()

    console.log('📑 Existing Indexes:\n')
    result.indexes.forEach((index: any) => {
      console.log(`  Name: ${index.name || 'unnamed'}`)
      console.log(`  Design Doc: ${index.ddoc || 'N/A'}`)
      console.log(`  Fields: [${index.def.fields.map((f: any) => Object.keys(f)[0]).join(', ')}]`)
      console.log('')
    })

    console.log(`Total indexes: ${result.indexes.length}`)
  } catch (error) {
    console.error('❌ Error listing indexes:', error)
    process.exit(1)
  }
}

// Run only when executed directly via node/tsx
const isDirect = process.argv[1] && (process.argv[1].endsWith('indexes.ts') || process.argv[1].endsWith('indexes.js'))
if (isDirect) {
  const command = process.argv[2]
  if (command === 'list') {
    listIndexes()
  } else {
    createIndexes()
      .then(() => process.exit(0))
      .catch(() => process.exit(1))
  }
}
