import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'
import { config } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function run() {
  if (config.dbProvider !== 'mysql') {
    console.error('DB_PROVIDER must be mysql to run this script.')
    process.exit(1)
  }

  const schemaPath = path.join(__dirname, 'mysql', 'schema.sql')
  const sql = await fs.readFile(schemaPath, 'utf8')

  const adminPool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 2,
    queueLimit: 0,
  })

  await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\``)
  await adminPool.end()

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
    await pool.query(sql)
    console.log('✅ MySQL schema applied successfully')
  } finally {
    await pool.end()
  }
}

run().catch((error) => {
  console.error('❌ Failed to apply MySQL schema:', error)
  process.exit(1)
})
