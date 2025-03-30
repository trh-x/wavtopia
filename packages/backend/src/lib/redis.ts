import Redis from "ioredis";
import { config } from "@wavtopia/core-storage";

declare global {
  var redisService: Redis | undefined;
}

// Prevent multiple instances of Redis Client in development
export const redis = global.redisService || new Redis(config.redis);

if (process.env.NODE_ENV !== "production") {
  global.redisService = redis;
}
