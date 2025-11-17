// src/routes/logs.routes.js
import express from "express";
import { promises as fs } from "fs";
import path from "path";

const router = express.Router();

// Middleware để check admin (customize theo dự án của bạn)
const isAdmin = (req, res, next) => {
  // TODO: Implement your admin check logic
  // For demo purposes, allowing all requests
  next();
};

// ⬅️ SỬA: Bỏ "/logs" vì đã có trong app.use("/api/admin/logs", ...)
// Get logs với pagination và filter
router.get("/", isAdmin, async (req, res) => {  // ⬅️ ĐỔI TỪ "/logs" THÀNH "/"
  try {
    const { type = "app", limit = 100, level } = req.query;
    
    let filename;
    switch(type) {
      case "security":
        filename = "security.log";
        break;
      case "error":
        filename = "error.log";
        break;
      default:
        filename = "app.log";
    }
    
    const logPath = path.join(process.cwd(), "logs", filename);
    const content = await fs.readFile(logPath, "utf-8");
    
    // Parse logs
    const logs = content
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    // Filter by level if specified
    let filteredLogs = logs;
    if (level) {
      filteredLogs = logs.filter(log => log.level === level);
    }
    
    // Get latest logs (reverse and limit)
    const latestLogs = filteredLogs.reverse().slice(0, parseInt(limit));
    
    res.json({
      success: true,
      total: filteredLogs.length,
      returned: latestLogs.length,
      logs: latestLogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get log statistics
router.get("/stats", isAdmin, async (req, res) => {  // ⬅️ ĐỔI TỪ "/logs/stats" THÀNH "/stats"
  try {
    const stats = {
      total: 0,
      byLevel: {},
      byStatus: {},
      recentErrors: [],
      securityEvents: []
    };
    
    // Read app.log
    const appLogPath = path.join(process.cwd(), "logs", "app.log");
    const appContent = await fs.readFile(appLogPath, "utf-8");
    const appLogs = appContent
      .split("\n")
      .filter(line => line.trim())
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(log => log !== null);
    
    stats.total = appLogs.length;
    
    // Count by level
    appLogs.forEach(log => {
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      if (log.statusCode) {
        const statusGroup = Math.floor(log.statusCode / 100) + "xx";
        stats.byStatus[statusGroup] = (stats.byStatus[statusGroup] || 0) + 1;
      }
    });
    
    // Get recent errors
    stats.recentErrors = appLogs
      .filter(log => log.level === "error")
      .reverse()
      .slice(0, 10);
    
    // Read security.log
    try {
      const securityLogPath = path.join(process.cwd(), "logs", "security.log");
      const securityContent = await fs.readFile(securityLogPath, "utf-8");
      stats.securityEvents = securityContent
        .split("\n")
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null)
        .reverse()
        .slice(0, 10);
    } catch (err) {
      // Security log might not exist yet
      stats.securityEvents = [];
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear logs (for demo/testing)
router.delete("/:type", isAdmin, async (req, res) => {  // ⬅️ ĐỔI TỪ "/logs/:type" THÀNH "/:type"
  try {
    const { type } = req.params;
    
    let filename;
    switch(type) {
      case "security":
        filename = "security.log";
        break;
      case "error":
        filename = "error.log";
        break;
      case "all":
        // Clear all logs
        await fs.writeFile(path.join(process.cwd(), "logs", "app.log"), "");
        await fs.writeFile(path.join(process.cwd(), "logs", "error.log"), "");
        await fs.writeFile(path.join(process.cwd(), "logs", "security.log"), "");
        return res.json({ success: true, message: "All logs cleared" });
      default:
        filename = "app.log";
    }
    
    const logPath = path.join(process.cwd(), "logs", filename);
    await fs.writeFile(logPath, "");
    
    res.json({
      success: true,
      message: `${type} logs cleared`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;