import Redis from 'ioredis';

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

// Cache key generators
export function generateCacheKey(type, ...identifiers) {
  return `fairshare:${type}:${identifiers.join(':')}`;
}

// Group data caching
export async function getCachedGroupData(groupId, userId) {
  try {
    const cacheKey = generateCacheKey('group', groupId, 'user', userId);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function setCachedGroupData(groupId, userId, data, ttl = 300) {
  try {
    const cacheKey = generateCacheKey('group', groupId, 'user', userId);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

// Balance caching
export async function getCachedBalances(groupId) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    console.error('Balance cache read error:', error);
    return null;
  }
}

export async function setCachedBalances(groupId, balances, ttl = 300) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    await redis.setex(cacheKey, ttl, JSON.stringify(balances));
  } catch (error) {
    console.error('Balance cache write error:', error);
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

// Cache invalidation
export async function invalidateGroupCache(groupId, userId = null) {
  try {
    const pattern = userId 
      ? generateCacheKey('group', groupId, 'user', userId)
      : generateCacheKey('group', groupId, '*');
    
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Cache invalidation error:', error);
  }
}

export async function invalidateBalanceCache(groupId) {
  try {
    const cacheKey = generateCacheKey('balances', groupId);
    await redis.del(cacheKey);
  } catch (error) {
    console.error('Balance cache invalidation error:', error);
  }
}

export async function invalidateExpenseCache(groupId) {
  try {
    const pattern = generateCacheKey('expenses', groupId, '*');
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Expense cache invalidation error:', error);
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