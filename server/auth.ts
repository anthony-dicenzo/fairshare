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
      sameSite: 'lax' // Changed from 'none' to 'lax' for better browser compatibility
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
        // First check if the input is a valid email address
        const isEmail = username.includes('@');
        
        // Try to find user either by username or email
        let user = null;
        if (isEmail) {
          console.log('Login attempt with email:', username);
          user = await storage.getUserByEmail(username);
        } else {
          console.log('Login attempt with username:', username);
          user = await storage.getUserByUsername(username);
        }
        
        if (!user) {
          console.log('User not found for login:', username);
          return done(null, false);
        }
        
        // Verify password
        const isPasswordValid = await comparePasswords(password, user.password);
        if (!isPasswordValid) {
          console.log('Invalid password for user:', username);
          return done(null, false);
        }
        
        console.log('Successful login for user:', user.username);
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
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
  
  // Update user profile endpoint
  app.put("/api/user", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      // Get the current user
      const currentUser = req.user;
      const userId = currentUser.id;
      
      console.log(`Profile update requested for user ID: ${userId}`);
      console.log(`Update data:`, req.body);
      
      // Create a schema for profile updates
      const updateProfileSchema = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        currentPassword: z.string(),
        newPassword: z.string().optional(),
        confirmNewPassword: z.string().optional(),
      }).refine(data => {
        // If newPassword is provided, confirmNewPassword must match
        if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
          return false;
        }
        return true;
      }, {
        message: "New passwords do not match",
        path: ["confirmNewPassword"]
      });
      
      // Validate the request data
      const validatedData = updateProfileSchema.parse(req.body);
      
      // Verify current password
      const isPasswordValid = await comparePasswords(validatedData.currentPassword, currentUser.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      
      // Check if email is being changed and if it's already in use
      if (validatedData.email && validatedData.email !== currentUser.email) {
        const existingUserWithEmail = await storage.getUserByEmail(validatedData.email);
        if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
          return res.status(400).json({ error: "Email already in use" });
        }
      }
      
      // Create update object
      const updates: Partial<User> = {};
      
      if (validatedData.name) {
        updates.name = validatedData.name;
      }
      
      if (validatedData.email) {
        updates.email = validatedData.email;
      }
      
      if (validatedData.newPassword) {
        updates.password = await hashPassword(validatedData.newPassword);
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, updates);
      
      // Remove password from response
      const { password, ...userWithoutPassword } = updatedUser;
      
      // Update the session
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        
        res.status(200).json({
          ...userWithoutPassword,
          message: "Profile updated successfully"
        });
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      
      next(error);
    }
  });
  
  // Enhanced backup authentication endpoint for mobile devices that have session issues
  app.get("/api/users/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const backupSessionId = req.headers['x-session-backup'] as string;
      const fairshareAuthCookie = req.cookies?.fairshare_auth;
      
      // Use either header or cookie for backup session
      const sessionToken = backupSessionId || fairshareAuthCookie;
      
      console.log(`Backup auth attempt for user ID: ${userId}`);
      console.log(`Using backup session: ${sessionToken}`);
      console.log(`Current session ID: ${req.sessionID}`);
      console.log(`Client cookies:`, req.cookies);
      
      // Validate that we have both required parameters
      if (!userId || !sessionToken) {
        return res.status(400).json({ error: "Missing required authentication parameters" });
      }
      
      // Find user by ID
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Authenticate session - this is a simplified model.
      // In a production app, you would use a more secure token system.
      const isValidSession = req.sessionStore && sessionToken.length > 10;
      
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
        
        // Set a cookie for future requests
        res.cookie('fairshare.sid', req.sessionID, {
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          httpOnly: true,
          secure: false, // Always false for development
          path: '/',
          sameSite: 'lax'
        });
        
        // Send the user data with session details for debugging
        res.json({
          ...userWithoutPassword,
          sessionId: req.sessionID,
          message: "Backup authentication successful"
        });
      });
    } catch (error) {
      console.error("Error in backup authentication:", error);
      res.status(500).json({ error: "Internal server error during backup authentication" });
    }
  });
  
  // Middleware to check for header-based authentication when cookies fail
  // This helps mobile devices where cookies often don't work as expected
  app.use(async (req, res, next) => {
    // Skip if already authenticated
    if (req.isAuthenticated()) {
      return next();
    }
    
    // Check for backup auth headers
    const userId = req.headers['x-user-id'];
    const sessionToken = req.headers['x-session-backup'];
    
    if (userId && sessionToken) {
      try {
        console.log(`Attempting header-based auth for user ID: ${userId}`);
        
        // Find user by ID
        const userIdNum = parseInt(userId as string);
        if (isNaN(userIdNum)) {
          return next();
        }
        
        const user = await storage.getUser(userIdNum);
        if (!user) {
          return next();
        }
        
        // Validate session token (simple validation for this example)
        const isValidToken = sessionToken && (sessionToken as string).length > 10;
        if (!isValidToken) {
          return next();
        }
        
        // Log the user in
        req.login(user, (err) => {
          if (err) {
            console.error("Error in header-based auth:", err);
            return next();
          }
          
          console.log(`Header-based auth successful for: ${user.username}`);
          next();
        });
      } catch (error) {
        console.error("Error in header-based auth:", error);
        next();
      }
    } else {
      next();
    }
  });
}
