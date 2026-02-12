// src/swagger.ts
import swaggerJsdoc from "swagger-jsdoc"

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Class Scheduling API",
      version: "1.0.0",
      description:
        "API for managing recurring and single classes, instructors, rooms, and room types with Redis caching. " +
        "All responses follow strict format: { title, message, data?, errors?, pagination? }",
      contact: {
        name: "Nischal Puri",
        email: "nischalpuri.dev@gmail.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3001/api",
        description: "Development server",
      },
      // Add production URL later if needed
    ],
    components: {
      schemas: {
        // ── Reusable Models ────────────────────────────────────────────────
        Instructor: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "John Doe" },
            email: { type: "string", example: "john.doe@example.com" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["name", "email"],
        },

        RoomType: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f191e810c19729de860ea" },
            roomTypeName: { type: "string", example: "Computer Lab" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["roomTypeName"],
        },

        PhysicalRoom: {
          type: "object",
          properties: {
            _id: { type: "string" },
            roomName: { type: "string", example: "Main Hall A" },
            roomTypeReference: {
              type: "string",
              example: "507f191e810c19729de860ea",
            },
            seatingCapacity: { type: "number", example: 30 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
          required: ["roomName", "roomTypeReference", "seatingCapacity"],
        },

        ClassSchedule: {
          type: "object",
          properties: {
            _id: { type: "string" },
            classTitle: { type: "string", example: "Yoga Basics" },
            assignedInstructor: { type: "string" },
            assignedRoom: { type: "string" },
            recurrenceType: {
              type: "string",
              enum: ["none", "daily", "weekly", "monthly", "custom"],
            },
            seriesStartDate: { type: "string", format: "date" },
            seriesEndDate: { type: "string", format: "date" },
          },
        },

        // ── Response Shapes (matches your api-response.ts) ──────────────────
        SuccessResponse: {
          type: "object",
          properties: {
            title: { type: "string", example: "Instructor Created" },
            message: {
              type: "string",
              example: "The new instructor has been added.",
            },
            data: { type: "object" }, // can be single object or array
          },
          required: ["title", "message"],
        },

        SuccessDeleteResponse: {
          type: "object",
          properties: {
            title: { type: "string", example: "Instructor Deleted" },
            message: {
              type: "string",
              example: "The instructor has been removed.",
            },
            data: { type: "object", example: {} },
          },
          required: ["title", "message", "data"],
        },

        PaginatedSuccessResponse: {
          allOf: [
            { $ref: "#/components/schemas/SuccessResponse" },
            {
              type: "object",
              properties: {
                pagination: {
                  type: "object",
                  properties: {
                    total: { type: "number", example: 25 },
                    page: { type: "number", example: 1 },
                    limit: { type: "number", example: 10 },
                    totalPages: { type: "number", example: 3 },
                  },
                  required: ["total", "page", "limit", "totalPages"],
                },
              },
            },
          ],
        },

        ErrorResponse: {
          type: "object",
          properties: {
            title: { type: "string", example: "Validation Error" },
            message: { type: "string", example: "Invalid input" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "email" },
                  message: { type: "string", example: "Email already exists" },
                },
                required: ["field", "message"],
              },
            },
          },
          required: ["title", "message"],
        },
      },
    },
  },
  apis: [
    "./src/routes/*.ts",
    "./src/controllers/*.ts",
    "./src/swagger.ts", // self-reference to include schemas
  ],
}

const swaggerSpec = swaggerJsdoc(options)

export default swaggerSpec
