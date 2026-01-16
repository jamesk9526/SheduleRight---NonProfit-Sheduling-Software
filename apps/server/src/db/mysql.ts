import mysql from 'mysql2/promise'
import { config } from '../config.js'

export type MySqlPool = mysql.Pool

export function createMySqlPool(): MySqlPool {
  return mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  })
}

export async function testMySqlConnection(pool: MySqlPool): Promise<void> {
  const [rows] = await pool.query('SELECT 1 as ok')
  if (!Array.isArray(rows)) {
    throw new Error('MySQL connection test failed')
  }
}
