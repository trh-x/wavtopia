import Redis from "ioredis";
import { config } from "@wavtopia/core-storage";

declare global {
  var redisService: Redis | undefined;
}

/**
 * In development, Next.js/Node.js hot reloading can cause multiple instances
 * of Redis clients to be created as modules get reloaded. This can lead to:
 * 1. Connection pool exhaustion
 * 2. Memory leaks
 * 3. Too many active connections
 *
 * To prevent this, we store the Redis instance on the global object in development.
 * This ensures we reuse the same connection across hot reloads.
 *
 * In production this is not needed since the server doesn't hot reload.
 */
export const redis = global.redisService || new Redis(config.redis);

if (process.env.NODE_ENV !== "production") {
  global.redisService = redis;
}
