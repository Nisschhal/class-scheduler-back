import { Redis } from "ioredis"
import dotenv from "dotenv"

dotenv.config()

// Fallback to local docker service named 'redis'
const redisUrl = process.env.REDIS_URL || "redis://redis:6379"

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  // If using local redis, we disable TLS (Upstash requires it, local doesn't)
  tls: redisUrl.startsWith("rediss://") ? {} : undefined,
})

redis.on("connect", () => {
  console.log(
    `✅ Redis Connected to: ${redisUrl.includes("upstash") ? "Upstash" : "Local Docker"}`,
  )
})

redis.on("error", (err) => {
  if ((err as any).code !== "ECONNREFUSED") {
    console.error("❌ Redis Error:", err.message)
  }
})
