import Redis from "ioredis";
import { config } from "../config";

export function createRedisConnection(): Redis {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

// Shared connection for caching (not BullMQ)
let _cacheClient: Redis | null = null;
export function getCacheClient(): Redis {
  if (!_cacheClient) {
    _cacheClient = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
  }
  return _cacheClient;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await getCacheClient().get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttl: number = 300): Promise<void> {
  try {
    await getCacheClient().set(key, JSON.stringify(value), "EX", ttl);
  } catch {}
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    const keys = await getCacheClient().keys(pattern);
    if (keys.length > 0) await getCacheClient().del(...keys);
  } catch {}
}
