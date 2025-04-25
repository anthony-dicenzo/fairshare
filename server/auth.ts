import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSecret = process.env.SESSION_SECRET || 'fairshare-session-secret';
  
  // Configure session with improved mobile compatibility
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: true, // Changed to true to ensure session is saved on every request
    saveUninitialized: true, // Changed to true to create session before interaction
    name: 'fairshare.sid', // Custom name helps avoid conflicts
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // Always false for development
      path: '/',
      sameSite: 'none' // Allow cross-site cookies for mobile webviews
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate the request body
      const registerSchema = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"]
      });
      
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ error: "Email already in use" });
      }
      
      // Create new user with hashed password
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Remove confirmPassword before creating user
      const { confirmPassword, ...userData } = validatedData;
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt from:", req.body.username);
    console.log("User agent:", req.headers["user-agent"]);
    
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        console.error("Authentication error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Failed login attempt for:", req.body.username);
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return next(err);
        }
        
        // Log successful login
        console.log(`User logged in successfully: ${user.username} (ID: ${user.id})`);
        console.log(`Session ID: ${req.sessionID}`);
        console.log("Session cookie:", req.session.cookie);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        
        // Return extended details for debugging
        return res.status(200).json({
          ...userWithoutPassword,
          sessionId: req.sessionID,
          message: "Login successful! If you have any issues accessing your data across devices, please try logging out and back in."
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    console.log(`Session ID in /api/user: ${req.sessionID}`);
    console.log(`Is authenticated: ${req.isAuthenticated()}`);
    console.log(`Session data:`, req.session);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Backup authentication endpoint for mobile devices that have session issues
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const backupSessionId = req.headers['x-session-backup'] as string;
      
      console.log(`Backup auth attempt for user ID: ${userId}`);
      console.log(`Using backup session ID: ${backupSessionId}`);
      console.log(`Current session ID: ${req.sessionID}`);
      
      // Validate that we have both required parameters
      if (!userId || !backupSessionId) {
        return res.status(400).json({ error: "Missing required authentication parameters" });
      }
      
      // Find user by ID
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Authenticate session - this is a simplified model.
      // In a production app, you would use a more secure token system.
      const isValidSession = req.sessionStore && backupSessionId.length > 10;
      
      if (!isValidSession) {
        return res.status(401).json({ error: "Invalid backup session" });
      }
      
      // Successfully authenticated via backup method
      console.log(`Backup authentication successful for user: ${user.username}`);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = user;
      
      // Log the user in properly
      req.login(user, (err) => {
        if (err) {
          console.error("Error logging in via backup method:", err);
          // Still return the user data even if we can't set the session
        }
        
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Error in backup authentication:", error);
      res.status(500).json({ error: "Internal server error during backup authentication" });
    }
  });
}
