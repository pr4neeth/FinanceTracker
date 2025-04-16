import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./mongo-routes";
import { setupVite, serveStatic, log } from "./vite";
import './mongodb'; // Import MongoDB connection
import { sendAllBillReminders } from './email-reminders';
import { storage } from './mongo-storage';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Server error:", err);
    
    // Send detailed error response in development
    if (app.get("env") === "development") {
      return res.status(status).json({
        message,
        error: err.toString(),
        stack: err.stack
      });
    }
    
    // Send simplified error in production
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 3000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    setupDailyBillReminders();
  });
})();

function setupDailyBillReminders() {
  // Function to calculate time until next run
  const getTimeUntilNextRun = () => {
    const now = new Date();
    const targetHour = 8; // 8:00 AM
    
    // Set target time for today at 8:00 AM
    const targetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      targetHour,
      0,
      0
    );
    
    // If it's already past 8:00 AM, schedule for tomorrow
    if (now.getHours() >= targetHour) {
      targetTime.setDate(targetTime.getDate() + 1);
    }
    
    // Calculate milliseconds until target time
    return targetTime.getTime() - now.getTime();
  };
  
  // Function to run bill reminders check and schedule next run
  const runAndScheduleNext = () => {
    log('Running scheduled bill reminders check...');
    
    // Run bill reminders check for all users
    sendAllBillReminders(storage)
      .then(() => {
        log('Scheduled bill reminders check completed successfully');
      })
      .catch((error) => {
        console.error('Error running scheduled bill reminders check:', error);
      })
      .finally(() => {
        // Schedule next run for tomorrow
        const timeUntilNextRun = getTimeUntilNextRun();
        log(`Next bill reminders check scheduled in ${Math.round(timeUntilNextRun / (1000 * 60 * 60))} hours`);
        
        setTimeout(runAndScheduleNext, timeUntilNextRun);
      });
  };
  
  // Calculate time until first run and schedule it
  const timeUntilFirstRun = getTimeUntilNextRun();
  log(`First bill reminders check scheduled in ${Math.round(timeUntilFirstRun / (1000 * 60 * 60))} hours`);
  
  setTimeout(runAndScheduleNext, timeUntilFirstRun);
}