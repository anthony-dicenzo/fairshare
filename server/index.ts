import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeBalanceCache } from "./init-balance-cache";
import { securityHeaders, sanitizeInput, apiLimiter, authLimiter, setRLSUserContext } from "./middleware/security";
import { dbHealthCheck, monitorConnections } from "./middleware/database";

// Environment validation
import { config } from '../config/environment';
import fs from 'fs';
import path from 'path';

// Write Google Client ID to .env.local for Vite access
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = `VITE_GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID || ''}\n`;
fs.writeFileSync(envLocalPath, envContent);

console.log('✅ Server starting with validated environment configuration');

const app = express();

// PRODUCTION FIX: Disable ETag generation to prevent 304 responses
app.set('etag', false);

// Performance optimizations
app.use(compression());
app.use((_, res, next) => { 
  res.set('Connection', 'keep-alive'); 
  next(); 
});

// Security middleware - applied first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://www.googleapis.com", "https://apis.google.com", "https://www.gstatic.com", "https://identitytoolkit.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.supabase.co", "https://*.supabase.co", "wss://*.supabase.co", "https://identitytoolkit.googleapis.com", "https://www.googleapis.com", "https://securetoken.googleapis.com"],
      frameSrc: ["https://fairshare-7f83a.firebaseapp.com", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false // Allow embedding for PWA functionality
}));

app.use(securityHeaders);
app.use(sanitizeInput);
app.use(dbHealthCheck);

// Performance timing middleware to measure request latency
app.use((req, res, next) => {
  res.locals.start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - res.locals.start) / 1e6;
    console.log(req.path, '→', ms.toFixed(1), 'ms');
  });
  next();
});

// Body parsing middleware - must come before other middleware that reads the body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Apply rate limiting to API routes (exclude health endpoint)
app.use('/api/', (req, res, next) => {
  if (req.path === '/api/health') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// Apply RLS context middleware to all API routes - after body parsing
app.use('/api/', setRLSUserContext);

app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/google-auth', authLimiter);

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

// Serve static files (including bare.html test)
app.use(express.static('.'));

(async () => {
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start database connection monitoring
    monitorConnections();
    
    // Initialize the balance cache in the background
    // This won't block server startup but ensures balances are up-to-date
    setTimeout(() => {
      initializeBalanceCache().catch(err => {
        console.error("Error during balance cache initialization:", err);
      });
    }, 5000); // Wait 5 seconds after server startup to begin initialization
  });
})();
