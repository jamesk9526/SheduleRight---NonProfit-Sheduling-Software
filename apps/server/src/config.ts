import dotenv from 'dotenv'

dotenv.config()

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.SERVER_PORT || '3001', 10),
  serverUrl: process.env.SERVER_URL || 'http://localhost:3001',
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  couchdbUrl: process.env.COUCHDB_URL || 'http://couchdb:5984',
  couchdbUser: process.env.COUCHDB_USER || 'admin',
  couchdbPassword: process.env.COUCHDB_PASSWORD || 'changeme',

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://redis:6379',

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  twilioVerifySid: process.env.TWILIO_VERIFY_SID || '',

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  jwtExpiry: parseInt(process.env.JWT_EXPIRY || '900', 10),
  refreshTokenExpiry: parseInt(process.env.REFRESH_TOKEN_EXPIRY || '604800', 10),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3001'],

  // Observability
  logLevel: process.env.LOG_LEVEL || 'info',
  otelEnabled: process.env.OTEL_ENABLED === 'true',
}
