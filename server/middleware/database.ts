import { Request, Response, NextFunction } from 'express';
import { db, pool } from '../db';

// Database health check middleware
export const dbHealthCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Quick database connectivity test
    if (db && pool) {
      // Test the connection with a simple query
      await pool.query('SELECT 1');
      req.app.locals.dbConnected = true;
    } else {
      req.app.locals.dbConnected = false;
    }
  } catch (error) {
    console.error('Database health check failed:', error);
    req.app.locals.dbConnected = false;
  }
  
  next();
};

// Database transaction wrapper middleware
export const withTransaction = (handler: (req: Request, res: Response, client: any) => Promise<void>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!pool) {
      return res.status(503).json({ error: 'Database unavailable' });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      await handler(req, res, client);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed:', error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Transaction failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } finally {
      client.release();
    }
  };
};

// Connection pool monitoring
export const monitorConnections = () => {
  if (!pool) return;

  setInterval(() => {
    if (pool) {
      console.log(`Database pool status: ${pool.totalCount} total, ${pool.idleCount} idle, ${pool.waitingCount} waiting`);
    }
  }, 300000); // Log every 5 minutes
};