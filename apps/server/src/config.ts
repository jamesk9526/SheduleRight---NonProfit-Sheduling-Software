import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

/**
 * Environment Configuration Schema
 * Validates all required environment variables on server startup
 */
const ConfigSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SERVER_PORT: z.string().default('3001').transform(Number),
  SERVER_URL: z.string().url().default('http://localhost:3001'),
  API_VERSION: z.string().default('v1'),

  // Database
  COUCHDB_URL: z.string().url('COUCHDB_URL must be a valid URL'),
  COUCHDB_USER: z.string().min(1, 'COUCHDB_USER is required'),
  COUCHDB_PASSWORD: z.string().min(1, 'COUCHDB_PASSWORD is required'),

  // Redis
  REDIS_URL: z.string().url().default('redis://redis:6379'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRY: z.string().default('900').transform(Number),
  REFRESH_TOKEN_EXPIRY: z.string().default('604800').transform(Number),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000,http://localhost:3001'),

  // Optional: Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  TWILIO_VERIFY_SID: z.string().optional(),

  // Observability
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OTEL_ENABLED: z.string().default('false'),
})

/**
 * Validate and load configuration
 */
function validateConfig() {
  try {
    const parsed = ConfigSchema.parse(process.env)
    
    // Parse CORS origins into array
    const corsOrigins = parsed.CORS_ORIGIN.split(',').map(origin => origin.trim())
    
    return {
      nodeEnv: parsed.NODE_ENV,
      port: parsed.SERVER_PORT,
      serverUrl: parsed.SERVER_URL,
      apiVersion: parsed.API_VERSION,
      
      // Database
      couchdbUrl: parsed.COUCHDB_URL,
      couchdbUser: parsed.COUCHDB_USER,
      couchdbPassword: parsed.COUCHDB_PASSWORD,
      
      // Redis
      redisUrl: parsed.REDIS_URL,
      
      // Twilio
      twilioAccountSid: parsed.TWILIO_ACCOUNT_SID || '',
      twilioAuthToken: parsed.TWILIO_AUTH_TOKEN || '',
      twilioPhoneNumber: parsed.TWILIO_PHONE_NUMBER || '',
      twilioVerifySid: parsed.TWILIO_VERIFY_SID || '',
      
      // Auth
      jwtSecret: parsed.JWT_SECRET,
      jwtExpiry: parsed.JWT_EXPIRY,
      refreshTokenExpiry: parsed.REFRESH_TOKEN_EXPIRY,
      
      // CORS
      corsOrigin: corsOrigins,
      
      // Observability
      logLevel: parsed.LOG_LEVEL,
      otelEnabled: parsed.OTEL_ENABLED === 'true',
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment configuration validation failed:\n')
      error.errors.forEach((err) => {
        console.error(`  ✗ ${err.path.join('.')}: ${err.message}`)
      })
      console.error('\nPlease check your .env file and ensure all required variables are set.')
      process.exit(1)
    }
    throw error
  }
}

export const config = validateConfig()

/**
 * Get sanitized config for logging (excludes secrets)
 */
export function getSanitizedConfig() {
  return {
    nodeEnv: config.nodeEnv,
    port: config.port,
    serverUrl: config.serverUrl,
    apiVersion: config.apiVersion,
    couchdbUrl: config.couchdbUrl,
    redisUrl: config.redisUrl,
    corsOrigin: config.corsOrigin,
    logLevel: config.logLevel,
    otelEnabled: config.otelEnabled,
    // Secrets excluded: jwtSecret, couchdbPassword, twilioAuthToken
  }
}

