import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format: [TIMESTAMP] LEVEL: message
 */
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

/**
 * Winston logger instance.
 * - Console transport with colors in development
 * - File transport for errors in production
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), logFormat),
    }),
  ],
});

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5,
    })
  );
}

export { logger };
