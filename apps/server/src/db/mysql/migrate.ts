import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { config } from '../../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureMigrationsTable(pool: mysql.Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `)
}

async function listApplied(pool: mysql.Pool): Promise<Set<string>> {
  const [rows] = await pool.query('SELECT name FROM migrations')
  const set = new Set<string>()
  for (const row of rows as any[]) set.add(row.name)
  return set
}

async function applyMigration(pool: mysql.Pool, name: string, sql: string) {
  await pool.query(sql)
  await pool.query('INSERT INTO migrations (name) VALUES (?)', [name])
  console.log(`  ✓ Applied migration: ${name}`)
}

export async function runMysqlMigrations() {
  if (config.dbProvider !== 'mysql') {
    console.log('Skipping MySQL migrations; provider is', config.dbProvider)
    return
  }

  console.log('🚚 Running MySQL migrations...')
  const migrationsDir = path.join(__dirname, 'migrations')
  const files = await fs.readdir(migrationsDir)
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort()

  const pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    multipleStatements: true,
  })

  try {
    await ensureMigrationsTable(pool)
    const applied = await listApplied(pool)

    for (const file of sqlFiles) {
      if (applied.has(file)) {
        console.log(`  ⊙ Skipping already applied: ${file}`)
        continue
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
      await applyMigration(pool, file, sql)
    }

    console.log('✅ Migrations complete')
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMysqlMigrations().catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
}
