import mongoose from "mongoose"
import dotenv from "dotenv"

dotenv.config()

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string)
    console.log("✅ MongoDB Connected")
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error)
    process.exit(1)
  }
}
