import pino from 'pino'
import { config } from './config.js'

const isDev = config.nodeEnv === 'development'

/**
 * Structured Logger Configuration
 * Uses Pino for high-performance structured logging
 */
export const logger = pino(
  {
    level: config.logLevel,
    // Production: JSON output for log aggregation
    // Development: Pretty-printed for readability
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
    // Base fields included in every log
    base: {
      env: config.nodeEnv,
      service: 'scheduleright-api',
    },
    // Serialize errors properly
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    // Redact sensitive fields
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        'accessToken',
        'refreshToken',
        'secret',
      ],
      censor: '[REDACTED]',
    },
  }
)

/**
 * Create a child logger with additional context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context)
}

/**
 * Log levels:
 * - trace: Very detailed debug information
 * - debug: Debug information
 * - info: Informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Fatal errors that cause shutdown
 */

