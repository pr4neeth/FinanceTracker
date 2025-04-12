import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { log, setupVite, serveStatic } from "./vite";
import { registerRoutes } from "./mongo-routes";
import './mongodb'; // Import to ensure MongoDB connection is established

// Load environment variables from .env file
dotenv.config();

// Create Express app
const app = express();

// Apply middleware
app.use(cors());
app.use(express.json());

// Set up routes
registerRoutes(app)
  .then((server) => {
    // Set up Vite development server if not in production
    if (process.env.NODE_ENV !== "production") {
      setupVite(app, server)
        .then(() => {
          // Start the server after Vite is set up
          const PORT = process.env.PORT || 5000;
          server.listen(PORT, () => {
            log(`serving on port ${PORT}`);
          });
        })
        .catch((err) => {
          console.error("Error setting up Vite:", err);
          process.exit(1);
        });
    } else {
      // In production, serve static files
      serveStatic(app);
      
      // Start the server
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => {
        log(`serving on port ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.error("Error setting up routes:", err);
    process.exit(1);
  });

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  
  // Send appropriate error response
  res.status(err.status || 500).json({
    message: err.message || "An unexpected error occurred",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});