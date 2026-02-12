/**
 * CENTRAL CACHE REGISTRY
 * Why: To prevent typos and make route changes easy to manage.
 * If we ever change the API version (e.g., /api/v1/...), we only change it here.
 */
export const CACHE_KEYS = {
  // Pattern for all Instructor-related GET requests
  INSTRUCTORS: "cache:/api/instructors*",

  // Pattern for all Room and Room-Type requests
  ROOMS: "cache:/api/rooms*",

  // Pattern for all Class Schedule requests
  CLASSES: "cache:/api/classes*",

  // A helper for global clearing if needed
  ALL: "cache:*",
}
