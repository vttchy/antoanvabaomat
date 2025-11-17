// src/utils/winston.config.js
import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom format để log đẹp hơn
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Console format (cho dev)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += `\n${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// Tạo logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  defaultMeta: { service: "ecommerce-api" },
  transports: [
    // Console (cho development)
    new winston.transports.Console({
      format: consoleFormat
    }),
    
    // File cho tất cả logs
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "app.log"),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File riêng cho errors
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    
    // File riêng cho security events
    new winston.transports.File({
      filename: path.join(process.cwd(), "logs", "security.log"),
      level: "warn",
      maxsize: 5242880,
      maxFiles: 5,
    })
  ],
});

// Helper functions để log với context
logger.logRequest = (req, res, duration, message = "Request processed") => {
  const logData = {
    message,
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    userId: req.user?.id || "anonymous",
    requestId: req.id || req.headers["x-request-id"],
    duration: `${duration}ms`,
    body: req.method !== "GET" ? sanitizeBody(req.body) : undefined
  };

  if (res.statusCode >= 500) {
    logger.error(logData);
  } else if (res.statusCode >= 400) {
    logger.warn(logData);
  } else {
    logger.info(logData);
  }
};

logger.logSecurity = (event, req, details = {}) => {
  logger.warn({
    message: `Security Event: ${event}`,
    event,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    userId: req.user?.id || "anonymous",
    url: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    ...details
  });
};

logger.logError = (error, req = null) => {
  const logData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
  };

  if (req) {
    logData.method = req.method;
    logData.url = req.originalUrl;
    logData.ip = req.ip || req.connection.remoteAddress;
    logData.userId = req.user?.id || "anonymous";
    logData.requestId = req.id || req.headers["x-request-id"];
  }

  logger.error(logData);
};

// Sanitize sensitive data
function sanitizeBody(body) {
  if (!body) return undefined;
  
  const sanitized = { ...body };
  const sensitiveFields = ["password", "token", "apiKey", "secret", "creditCard"];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = "***REDACTED***";
    }
  });
  
  return sanitized;
}

export default logger;