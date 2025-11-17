// src/middlewares/security-logger.middleware.js
import logger from "../utils/winston.config.js";
import crypto from "crypto";

// Thêm request ID cho mỗi request
export const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers["x-request-id"] || crypto.randomUUID();
  res.setHeader("X-Request-ID", req.id);
  next();
};

// Log mọi request với structured data
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log khi response được gửi
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// Detect suspicious activity
export const securityMonitor = (req, res, next) => {
  // SQL Injection patterns
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b|--|;|'|"|\*|xp_)/gi;
  
  // XSS patterns
  const xssPattern = /<script|javascript:|onerror=|onload=/gi;
  
  const checkString = JSON.stringify(req.query) + JSON.stringify(req.body) + req.originalUrl;
  
  if (sqlInjectionPattern.test(checkString)) {
    logger.logSecurity("SQL_INJECTION_ATTEMPT", req, {
      severity: "high",
      pattern: "SQL Injection detected",
      data: checkString.substring(0, 200)
    });
  }
  
  if (xssPattern.test(checkString)) {
    logger.logSecurity("XSS_ATTEMPT", req, {
      severity: "high",
      pattern: "XSS detected",
      data: checkString.substring(0, 200)
    });
  }
  
  next();
};

// Failed login tracker
const failedLoginTracker = new Map();

export const trackFailedLogin = (req, identifier) => {
  const ip = req.ip || req.connection.remoteAddress;
  const key = `${ip}:${identifier}`;
  
  const attempts = failedLoginTracker.get(key) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  
  failedLoginTracker.set(key, attempts);
  
  // Alert nếu quá 5 lần trong 5 phút
  if (attempts.count >= 5) {
    logger.logSecurity("BRUTE_FORCE_ATTEMPT", req, {
      severity: "critical",
      attempts: attempts.count,
      timeWindow: "5 minutes",
      identifier
    });
  } else if (attempts.count >= 3) {
    logger.logSecurity("FAILED_LOGIN", req, {
      severity: "medium",
      attempts: attempts.count,
      identifier
    });
  }
  
  // Clean up old entries (> 5 minutes)
  setTimeout(() => {
    const current = failedLoginTracker.get(key);
    if (current && Date.now() - current.lastAttempt > 300000) {
      failedLoginTracker.delete(key);
    }
  }, 300000);
};

// Log successful login
export const logSuccessfulLogin = (req, userId) => {
  logger.info({
    message: "Successful login",
    event: "LOGIN_SUCCESS",
    userId,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get("user-agent"),
    timestamp: new Date().toISOString()
  });
  
  // Clear failed attempts
  const ip = req.ip || req.connection.remoteAddress;
  const keys = Array.from(failedLoginTracker.keys()).filter(k => k.startsWith(ip));
  keys.forEach(k => failedLoginTracker.delete(k));
};

// Log sensitive operations
export const logSensitiveOperation = (operation) => {
  return (req, res, next) => {
    logger.warn({
      message: `Sensitive operation: ${operation}`,
      event: "SENSITIVE_OPERATION",
      operation,
      userId: req.user?.id || "anonymous",
      ip: req.ip || req.connection.remoteAddress,
      url: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    next();
  };
};