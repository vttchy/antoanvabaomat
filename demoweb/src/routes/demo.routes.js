// src/routes/demo.routes.js - Tạo file này để test
import express from "express";
import logger from "../utils/winston.config.js";
import { trackFailedLogin, logSuccessfulLogin } from "../middlewares/security-logger.middleware.js";

const router = express.Router();

// ===== DEMO: Normal successful request =====
router.get("/success", (req, res) => {
  res.json({
    success: true,
    message: "This is a successful request",
    timestamp: new Date().toISOString()
  });
});

// ===== DEMO: 404 Error =====
router.get("/not-found", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Resource not found"
  });
});

// ===== DEMO: 500 Error =====
router.get("/error", (req, res, next) => {
  const error = new Error("Simulated server error for demo");
  error.status = 500;
  next(error);
});

// ===== DEMO: Failed login =====
router.post("/login-fail", (req, res) => {
  const { email } = req.body;
  
  // Simulate failed login
  trackFailedLogin(req, email || "test@example.com");
  
  res.status(401).json({
    success: false,
    message: "Invalid credentials"
  });
});

// ===== DEMO: Successful login =====
router.post("/login-success", (req, res) => {
  const { email } = req.body;
  
  // Simulate successful login
  const fakeUserId = "user-demo-123";
  logSuccessfulLogin(req, fakeUserId);
  
  res.json({
    success: true,
    message: "Login successful",
    userId: fakeUserId
  });
});

// ===== DEMO: SQL Injection attempt =====
router.get("/sql-injection", (req, res) => {
  // This will trigger security monitor
  // Try: /demo/sql-injection?query=SELECT * FROM users--
  res.json({
    success: false,
    message: "SQL injection attempt detected and logged"
  });
});

// ===== DEMO: XSS attempt =====
router.post("/xss", (req, res) => {
  // Try sending: { "comment": "<script>alert('xss')</script>" }
  res.json({
    success: false,
    message: "XSS attempt detected and logged"
  });
});

// ===== DEMO: Slow request (for performance monitoring) =====
router.get("/slow", async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
  res.json({
    success: true,
    message: "This was a slow request (3 seconds)"
  });
});

// ===== DEMO: Multiple failed logins (brute force) =====
router.post("/brute-force", async (req, res) => {
  const email = "victim@example.com";
  
  // Simulate 6 failed attempts rapidly
  for (let i = 0; i < 6; i++) {
    trackFailedLogin(req, email);
  }
  
  res.json({
    success: false,
    message: "Brute force attack simulated (6 failed attempts logged)"
  });
});

// ===== DEMO: Unauthorized access =====
router.get("/unauthorized", (req, res) => {
  res.status(403).json({
    success: false,
    message: "Unauthorized access attempt"
  });
});

// ===== DEMO: Rate limit exceeded =====
router.get("/rate-limit", (req, res) => {
  res.status(429).json({
    success: false,
    message: "Too many requests"
  });
});

export default router;