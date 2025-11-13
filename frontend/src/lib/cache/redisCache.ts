/**
 * Redis Cache Adapter for Mirai App
 * Provides caching layer with optimistic locking support
 */

import { createClient, RedisClientType } from 'redis';

export interface CacheEntry<T = any> {
  data: T;
  etag: string;
  timestamp: number;
  version: number;
}

export class RedisCache {
  private client: RedisClientType | null = null;
  private connected = false;
  private readonly defaultTTL = 300; // 5 minutes in seconds

  constructor(
    private readonly redisUrl: string = process.env.REDIS_URL || 'redis://redis.redis.svc.cluster.local:6379'
  ) {}

  /**
   * Initialize Redis connection
   */
  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      this.client = createClient({
        url: this.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error('Redis: Max reconnection attempts reached');
              return new Error('Max reconnection attempts');
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
      });

      this.client.on('connect', () => {
        console.log('Redis: Connected successfully');
      });

      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Redis: Connection failed, falling back to no-cache mode', error);
      this.client = null;
      this.connected = false;
    }
  }

  /**
   * Get cached value with etag validation
   */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.connected || !this.client) return null;

    try {
      const cached = await this.client.get(key);
      if (!cached) return null;

      const entry = JSON.parse(cached) as CacheEntry<T>;

      // Check if cache is stale (older than 24 hours)
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - entry.timestamp > dayInMs) {
        await this.delete(key);
        return null;
      }

      return entry;
    } catch (error) {
      console.error(`Redis: Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value with optimistic locking
   * Returns false if etag doesn't match (concurrent modification)
   */
  async set<T>(
    key: string,
    data: T,
    etag?: string,
    ttl: number = this.defaultTTL
  ): Promise<{ success: boolean; newEtag: string }> {
    if (!this.connected || !this.client) {
      return { success: false, newEtag: '' };
    }

    try {
      // Check current etag if provided
      if (etag) {
        const current = await this.get<T>(key);
        if (current && current.etag !== etag) {
          // Concurrent modification detected
          return { success: false, newEtag: current.etag };
        }
      }

      // Generate new etag
      const newEtag = this.generateEtag(data);
      const version = await this.getNextVersion(key);

      const entry: CacheEntry<T> = {
        data,
        etag: newEtag,
        timestamp: Date.now(),
        version
      };

      await this.client.setEx(key, ttl, JSON.stringify(entry));

      return { success: true, newEtag };
    } catch (error) {
      console.error(`Redis: Error setting key ${key}:`, error);
      return { success: false, newEtag: '' };
    }
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis: Error deleting key ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all keys matching pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.connected || !this.client) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
    } catch (error) {
      console.error(`Redis: Error invalidating pattern ${pattern}:`, error);
    }
  }

  /**
   * Acquire distributed lock for critical sections
   */
  async acquireLock(
    lockKey: string,
    ttl: number = 10
  ): Promise<{ acquired: boolean; lockId: string }> {
    if (!this.connected || !this.client) {
      return { acquired: false, lockId: '' };
    }

    const lockId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const result = await this.client.set(
        `lock:${lockKey}`,
        lockId,
        {
          NX: true, // Only set if not exists
          EX: ttl   // Expire after ttl seconds
        }
      );

      return { acquired: result === 'OK', lockId };
    } catch (error) {
      console.error(`Redis: Error acquiring lock ${lockKey}:`, error);
      return { acquired: false, lockId: '' };
    }
  }

  /**
   * Release distributed lock
   */
  async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    if (!this.connected || !this.client) return false;

    try {
      // Lua script to ensure we only delete our own lock
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;

      const result = await this.client.eval(
        script,
        {
          keys: [`lock:${lockKey}`],
          arguments: [lockId]
        }
      ) as number;

      return result === 1;
    } catch (error) {
      console.error(`Redis: Error releasing lock ${lockKey}:`, error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.connected = false;
      this.client = null;
    }
  }

  /**
   * Generate etag from data
   */
  private generateEtag(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `W/"${Math.abs(hash).toString(36)}-${Date.now().toString(36)}"`;
  }

  /**
   * Get next version number for optimistic locking
   */
  private async getNextVersion(key: string): Promise<number> {
    const current = await this.get(key);
    return current ? current.version + 1 : 1;
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

/**
 * Get or create cache instance
 */
export function getCache(): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache();
  }
  return cacheInstance;
}

/**
 * Cache key generators
 */
export const CacheKeys = {
  library: () => 'library:index',
  course: (id: string) => `course:${id}`,
  folderCourses: (folderId: string) => `folder:${folderId}:courses`,
  allCourses: () => 'courses:all',
  coursesByStatus: (status: string) => `courses:status:${status}`,
  coursesByTag: (tag: string) => `courses:tag:${tag}`
};