import { Router } from "express"
import instructorRoutes from "./instructor.route.js"
import roomRoutes from "./room.route.js"
import classRoutes from "./class.route.js"

const router = Router()

router.use("/instructors", instructorRoutes)
router.use("/rooms", roomRoutes)
router.use("/classes", classRoutes)

export default router
