import express, { type Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Load environment variables from .env file
config();

const app = express();

// Enhanced CORS middleware for WebSocket support
app.use((req, res, next) => {
  // Set CORS headers for all requests including WebSocket upgrade requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, UPGRADE');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

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
  // Log environment variable status
  log(`🔑 Environment Variables Status:`);
  log(`   DEEPGRAM_API_KEY: ${process.env.DEEPGRAM_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
  log(`   GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
  log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Enhanced server configuration for WebContainer
  const port = 5000;
  const host = process.env.REPL_ID || process.env.WEBCONTAINER ? '0.0.0.0' : 'localhost';
  
  server.listen({
    port,
    host,
    reusePort: true,
  }, () => {
    log(`🚀 Server running on ${host}:${port}`);
    log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`📦 WebContainer: ${process.env.WEBCONTAINER ? 'Yes' : 'No'}`);
    log(`🔧 Replit: ${process.env.REPL_ID ? 'Yes' : 'No'}`);
    
    // Log WebSocket server status
    const wsServer = (server as any).wsServer;
    if (wsServer) {
      log(`🔌 WebSocket server: Active on /ws`);
    } else {
      log(`⚠️ WebSocket server: Not detected`);
    }

    // Log API proxy status
    log(`🔗 API Proxy: /api/* requests forwarded to backend`);
    log(`🤖 Gemini API: ${process.env.GEMINI_API_KEY ? 'Ready' : 'Not configured'}`);
    log(`🎤 Deepgram API: ${process.env.DEEPGRAM_API_KEY ? 'Ready' : 'Not configured'}`);
  });
})();