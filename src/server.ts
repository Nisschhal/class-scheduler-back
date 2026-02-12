import dotenv from "dotenv"
dotenv.config()

import app from "./app.js"
import { connectDB } from "./config/db.js"

const PORT = process.env.PORT || 3001

// Connect to Database first
connectDB()
  .then(() => {
    // Only start the server if DB connection is successful
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error("Failed to start server due to DB error", err)
  })
