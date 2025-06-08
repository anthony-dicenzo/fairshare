import Redis from 'ioredis';

// Initialize Redis connection with fallback to in-memory cache
let redis = null;
const memoryCache = new Map();
const cacheExpirations = new Map();

try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  redis.on('error', (error) => {
    console.log('Using in-memory cache as Redis fallback');
    redis = null;
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully');
  });
} catch (error) {
  console.log('Using in-memory cache (Redis unavailable)');
  redis = null;
}

// Memory cache cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, expiration] of cacheExpirations.entries()) {
    if (now > expiration) {
      memoryCache.delete(key);
      cacheExpirations.delete(key);
    }
  }
}, 60000); // Clean up every minute

// Cache key generators
export function generateCacheKey(type, ...identifiers) {
  return `fairshare:${type}:${identifiers.join(':')}`;
}

// Group data caching with fallback
export async function getCachedGroupData(groupId, userId) {
  try {
    const cacheKey = generateCacheKey('group', groupId, 'user', userId);
    
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } else {
      // Memory cache fallback
      const now = Date.now();
      const expiration = cacheExpirations.get(cacheKey);
      if (expiration && now < expiration) {
        return memoryCache.get(cacheKey);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function setCachedGroupData(groupId, userId, data, ttl = 300) {
  try {
    const cacheKey = generateCacheKey('group', groupId, 'user', userId);
    
    if (redis) {
      await redis.setex(cacheKey, ttl, JSON.stringify(data));
    } else {
      // Memory cache fallback
      memoryCache.set(cacheKey, data);
      cacheExpirations.set(cacheKey, Date.now() + (ttl * 1000));
    }
  } catch (error) {
    // Fallback to memory cache
    const cacheKey = generateCacheKey('group', groupId, 'user', userId);
    memoryCache.set(cacheKey, data);
    cacheExpirations.set(cacheKey, Date.now() + (ttl * 1000));
  }
}

// Balance caching with fallback
export async function getCachedBalances(groupId) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } else {
      // Memory cache fallback
      const now = Date.now();
      const expiration = cacheExpirations.get(cacheKey);
      if (expiration && now < expiration) {
        return memoryCache.get(cacheKey);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

export async function setCachedBalances(groupId, balances, ttl = 300) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    
    if (redis) {
      await redis.setex(cacheKey, ttl, JSON.stringify(balances));
    } else {
      // Memory cache fallback
      memoryCache.set(cacheKey, balances);
      cacheExpirations.set(cacheKey, Date.now() + (ttl * 1000));
    }
  } catch (error) {
    // Fallback to memory cache
    const cacheKey = generateCacheKey('balances', groupId);
    memoryCache.set(cacheKey, balances);
    cacheExpirations.set(cacheKey, Date.now() + (ttl * 1000));
  }
}

// Expense list caching
export async function getCachedExpenses(groupId, page = 1, limit = 20) {
  try {
    const cacheKey = generateCacheKey('expenses', groupId, page, limit);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    console.error('Expense cache read error:', error);
    return null;
  }
}

export async function setCachedExpenses(groupId, expenses, page = 1, limit = 20, ttl = 180) {
  try {
    const cacheKey = generateCacheKey('expenses', groupId, page, limit);
    await redis.setex(cacheKey, ttl, JSON.stringify(expenses));
  } catch (error) {
    console.error('Expense cache write error:', error);
  }
}

// Cache invalidation with fallback
export async function invalidateGroupCache(groupId, userId = null) {
  try {
    if (redis) {
      const pattern = userId 
        ? generateCacheKey('group', groupId, 'user', userId)
        : generateCacheKey('group', groupId, '*');
      
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Clear from memory cache
      if (userId) {
        const cacheKey = generateCacheKey('group', groupId, 'user', userId);
        memoryCache.delete(cacheKey);
        cacheExpirations.delete(cacheKey);
      } else {
        const prefix = generateCacheKey('group', groupId);
        for (const [key] of memoryCache.entries()) {
          if (key.startsWith(prefix)) {
            memoryCache.delete(key);
            cacheExpirations.delete(key);
          }
        }
      }
    }
  } catch (error) {
    // Fallback: clear from memory cache
    if (userId) {
      const cacheKey = generateCacheKey('group', groupId, 'user', userId);
      memoryCache.delete(cacheKey);
      cacheExpirations.delete(cacheKey);
    } else {
      const prefix = generateCacheKey('group', groupId);
      for (const [key] of memoryCache.entries()) {
        if (key.startsWith(prefix)) {
          memoryCache.delete(key);
          cacheExpirations.delete(key);
        }
      }
    }
  }
}

export async function invalidateBalanceCache(groupId) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    
    if (redis) {
      await redis.del(cacheKey);
    } else {
      // Clear from memory cache
      memoryCache.delete(cacheKey);
      cacheExpirations.delete(cacheKey);
    }
  } catch (error) {
    // Fallback: clear from memory cache
    const cacheKey = generateCacheKey('balances', groupId);
    memoryCache.delete(cacheKey);
    cacheExpirations.delete(cacheKey);
  }
}

export async function invalidateExpenseCache(groupId) {
  try {
    if (redis) {
      const pattern = generateCacheKey('expenses', groupId, '*');
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // Clear from memory cache
      const prefix = generateCacheKey('expenses', groupId);
      for (const [key] of memoryCache.entries()) {
        if (key.startsWith(prefix)) {
          memoryCache.delete(key);
          cacheExpirations.delete(key);
        }
      }
    }
  } catch (error) {
    // Fallback: clear from memory cache
    const prefix = generateCacheKey('expenses', groupId);
    for (const [key] of memoryCache.entries()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
        cacheExpirations.delete(key);
      }
    }
  }
}

// Batch cache operations
export async function invalidateAllGroupData(groupId) {
  await Promise.all([
    invalidateGroupCache(groupId),
    invalidateBalanceCache(groupId),
    invalidateExpenseCache(groupId)
  ]);
}

export default redis;