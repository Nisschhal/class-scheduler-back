import { type Response } from "express"

/**
 * Interface for Pagination
 * Why: Ensures that whenever we send a list, we include these exact 4 keys
 * as requested in the "Success Response With Pagination" requirement.
 */
export interface IPagination {
  total: number // Total number of records in the database
  page: number // The current page the user is viewing
  limit: number // How many items per page
  totalPages: number // Total count divided by limit (rounded up)
}

/**
 * Interface for Error Details
 * Why: Strictly follows the requirement: { "field": "...", "message": "..." }
 */
export interface IErrorDetail {
  field: string
  message: string
}

/**
 * SUCCESS RESPONSE HELPER
 * Requirement: "Success responses must return clean and predictable structures"
 *
 * @param res - Express Response object
 * @param title - Brief title of the success (e.g., "Classes fetched")
 * @param message - User-friendly description (e.g., "Class list loaded")
 * @param data - The actual payload (Array or Object)
 * @param pagination - (Optional) Pagination metadata
 */
export const sendSuccess = (
  res: Response,
  title: string,
  message: string,
  data: any = {}, // Default to empty object if no data provided
  pagination: IPagination | null = null,
) => {
  // Construct the base response
  const responseBody: any = {
    title: title,
    message: message,
    data: data,
  }

  /**
   * EDGE CASE: Success With Pagination
   * If pagination is provided, we attach it to the root of the object.
   */
  if (pagination) {
    responseBody.pagination = {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.totalPages,
    }
  }

  return res.status(200).json(responseBody)
}

/**
 * ERROR RESPONSE HELPER
 * Requirement: "Errors must include clear field-level messages"
 *
 * @param res - Express Response object
 * @param title - Category of the error (e.g., "Validation Error")
 * @param message - High-level error description
 * @param errors - Array of field-level details
 * @param statusCode - HTTP status code (Default 400 for Client Errors)
 */
export const sendError = (
  res: Response,
  title: string,
  message: string,
  errors: IErrorDetail[] = [],
  statusCode: number = 400,
) => {
  return res.status(statusCode).json({
    title: title,
    message: message,
    errors: errors,
  })
}
