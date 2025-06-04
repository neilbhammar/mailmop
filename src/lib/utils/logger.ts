/**
 * Production-safe logging utility for MailMop
 * 
 * This provides structured logging with different levels and contexts.
 * In production, it filters out debug logs and sensitive information.
 */

interface LogContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  method?: string;
  headers?: Record<string, any>;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: string, message: string, context?: LogContext) {
    // In production, only log warnings and errors
    if (!this.isDevelopment && (level === 'debug' || level === 'info')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    // Remove sensitive information from logs
    if (logEntry.headers) {
      delete logEntry.headers.authorization;
      delete logEntry.headers.cookie;
    }

    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  // API-specific logger with structured format
  api = {
    debug: (message: string, context?: LogContext) => this.debug(`[API] ${message}`, context),
    info: (message: string, context?: LogContext) => this.info(`[API] ${message}`, context),
    warn: (message: string, context?: LogContext) => this.warn(`[API] ${message}`, context),
    error: (message: string, context?: LogContext) => this.error(`[API] ${message}`, context),
  };

  // Middleware-specific logger
  middleware = {
    debug: (message: string, context?: LogContext) => this.debug(`[Middleware] ${message}`, context),
    info: (message: string, context?: LogContext) => this.info(`[Middleware] ${message}`, context),
    warn: (message: string, context?: LogContext) => this.warn(`[Middleware] ${message}`, context),
    error: (message: string, context?: LogContext) => this.error(`[Middleware] ${message}`, context),
  };

  // Security-specific logger for tracking security events
  security = {
    debug: (message: string, context?: LogContext) => this.debug(`[Security] ${message}`, context),
    info: (message: string, context?: LogContext) => this.info(`[Security] ${message}`, context),
    warn: (message: string, context?: LogContext) => this.warn(`[Security] ${message}`, context),
    error: (message: string, context?: LogContext) => this.error(`[Security] ${message}`, context),
  };
}

export const logger = new Logger(); 