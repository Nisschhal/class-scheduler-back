import { Redis } from "ioredis"
import dotenv from "dotenv"

dotenv.config()

const redisUrl = process.env.REDIS_URL

if (!redisUrl) {
  console.error("❌ REDIS_URL is missing in .env")
}

// Create one single instance to be shared
export const redis = new Redis(redisUrl as string, {
  maxRetriesPerRequest: 3,
  // This stops the infinite "ECONNREFUSED" loop if it fails
})

redis.on("connect", () => console.log("✅ Connected to Upstash Redis"))
redis.on("error", (err) => {
  if ((err as any).code !== "ECONNREFUSED") {
    // Ignore initial connection noise
    console.error("❌ Redis Error:", err.message)
  }
})
