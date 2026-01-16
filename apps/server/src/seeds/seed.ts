import nano from 'nano'
import { config } from '../config.js'
import { hashPassword } from '../services/auth.service.js'

/**
 * Seed script - Add test users and data to CouchDB
 * Run with: pnpm seed
 */

async function seed() {
  try {
    console.log('🌱 Starting database seed...')

    // Connect to CouchDB
    const db = nano(config.couchdbUrl)

    // Create database if it doesn't exist
    const databases = await db.db.list()
    if (!databases.includes('scheduleright')) {
      console.log('📦 Creating scheduleright database...')
      await db.db.create('scheduleright')
    }

    const scheduleDb = db.use('scheduleright')

    // Create test organization
    const org = {
      _id: 'org:test-001',
      type: 'org',
      name: 'Test Community Center',
      tenantId: 'tenant:test-001',
      settings: {
        timezone: 'US/Eastern',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await scheduleDb.insert(org)
      console.log('✅ Organization created: Test Community Center')
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log('⏭️  Organization already exists')
      } else {
        throw error
      }
    }

    // Create test users
    const users = [
      {
        _id: 'user:admin-001',
        type: 'user',
        email: 'admin@example.com',
        name: 'Admin User',
        passwordHash: hashPassword('admin123'),
        orgId: 'org:test-001',
        roles: ['ADMIN'],
        verified: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user:staff-001',
        type: 'user',
        email: 'staff@example.com',
        name: 'Staff Member',
        passwordHash: hashPassword('staff123'),
        orgId: 'org:test-001',
        roles: ['STAFF'],
        verified: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user:volunteer-001',
        type: 'user',
        email: 'volunteer@example.com',
        name: 'Volunteer',
        passwordHash: hashPassword('volunteer123'),
        orgId: 'org:test-001',
        roles: ['VOLUNTEER'],
        verified: true,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'user:client-001',
        type: 'user',
        email: 'client@example.com',
        name: 'Client User',
        passwordHash: hashPassword('client123'),
        orgId: 'org:test-001',
        roles: ['CLIENT'],
        verified: false,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    for (const user of users) {
      try {
        await scheduleDb.insert(user)
        console.log(`✅ User created: ${user.email}`)
      } catch (error: any) {
        if (error.statusCode === 409) {
          console.log(`⏭️  User already exists: ${user.email}`)
        } else {
          throw error
        }
      }
    }

    // Create test site
    const site = {
      _id: 'site:main-001',
      type: 'site',
      orgId: 'org:test-001',
      name: 'Main Campus',
      address: '123 Main St, Boston MA',
      timezone: 'US/Eastern',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      await scheduleDb.insert(site)
      console.log('✅ Site created: Main Campus')
    } catch (error: any) {
      if (error.statusCode === 409) {
        console.log('⏭️  Site already exists')
      } else {
        throw error
      }
    }

    console.log('\n🎉 Seed completed successfully!')
    console.log('\n📝 Test credentials:')
    console.log('  Admin:     admin@example.com / admin123')
    console.log('  Staff:     staff@example.com / staff123')
    console.log('  Volunteer: volunteer@example.com / volunteer123')
    console.log('  Client:    client@example.com / client123')
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

seed()
