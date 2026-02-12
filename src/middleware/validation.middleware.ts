// middleware/validate.middleware.ts
import { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { sendError } from "../utils/api-response.js"

export const validate =
  <T extends z.ZodType<any, any, any>>(schema: T) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log("Starting validation for request:", req.body)
      console.log("Starting validation for params:", req.params)
      console.log("Starting validation for query:", req.query)
      // Validate body, query, and params
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      // FIX: Only overwrite if the property exists in the parsed Zod result
      if (parsed.body) req.body = parsed.body
      if (parsed.query) req.query = parsed.query

      // If the schema didn't define params, parsed.params will be empty/undefined.
      // We check if parsed.params has keys before overwriting.
      if (parsed.params && Object.keys(parsed.params).length > 0) {
        req.params = parsed.params
      }
      console.log("Validation successful:", parsed)

      // // Replace req with parsed data (strips unknown fields)
      // req.body = parsed.body
      // req.query = parsed.query
      // req.params = parsed.params

      return next()
    } catch (error) {
      console.error("Validation error:", error)
      if (error instanceof z.ZodError) {
        const errorDetails = error.issues.map((issue) => ({
          // If the error is in the body, we just show the field name
          field:
            issue.path.length > 1
              ? String(issue.path[1])
              : String(issue.path[0]),
          message: issue.message,
        }))

        return sendError(
          res,
          "Validation Error",
          "Invalid input data provided.",
          errorDetails,
        )
      }
      return sendError(res, "Server Error", "Validation failed unexpectedly.")
    }
  }
