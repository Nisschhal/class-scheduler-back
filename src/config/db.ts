import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

// If DATABASE_URL is missing, we assume we are in Docker and use the service name 'mongodb'
const dbUrl = process.env.DATABASE_URL || "mongodb://mongodb:27017/schedulr"

export const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl)
    console.log(
      `✅ MongoDB Connected to: ${dbUrl.includes("cluster") ? "Cloud Atlas" : "Local Docker"}`,
    )
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error)
    process.exit(1)
  }
}
