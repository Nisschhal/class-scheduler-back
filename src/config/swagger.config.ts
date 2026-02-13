import swaggerJSDoc from "swagger-jsdoc"

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Class Scheduling API",
    version: "1.0.0",
    description:
      "API for managing recurring and single classes, instructors, rooms, and room types with Redis caching. " +
      "All responses follow strict given formats in the reqquirement document.",
    contact: {
      name: "Nischal Puri",
      email: "nischalpuri.dev@gmail.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3001/api",
      description: "Local Development",
    },
    {
      url: "https://class-scheduler-back.onrender.com/api", // ← REPLACE with YOUR Render URL
      description: "Production (Render)",
    },
  ],
  components: {
    schemas: {
      /* --- SHARED / UTILITY SCHEMAS --- */
      Pagination: {
        type: "object",
        properties: {
          total: { type: "integer", example: 7 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          totalPages: { type: "integer", example: 1 },
        },
      },
      ErrorDetail: {
        type: "object",
        properties: {
          field: { type: "string", example: "assignedInstructor" },
          message: {
            type: "string",
            example: "Conflict Detected: Entity occupied...",
          },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          title: { type: "string", example: "Validation Error" },
          message: { type: "string", example: "Invalid input data provided" },
          errors: {
            type: "array",
            items: { $ref: "#/components/schemas/ErrorDetail" },
          },
        },
      },

      /* --- DATA MODELS (Matching Postman / Mongoose) --- */
      Instructor: {
        type: "object",
        properties: {
          _id: { type: "string", example: "698d88c9478e1b4d10de183e" },
          name: { type: "string", example: "Nischal Puri" },
          email: { type: "string", example: "nisal@gmail.com" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          __v: { type: "integer", example: 0 },
        },
      },
      RoomType: {
        type: "object",
        properties: {
          _id: { type: "string", example: "698df3e410e67adb730c7daf" },
          roomTypeName: { type: "string", example: "Test Lab" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          __v: { type: "integer", example: 0 },
        },
      },
      PhysicalRoom: {
        type: "object",
        properties: {
          _id: { type: "string", example: "698df3ed10e67adb730c7db6" },
          roomName: { type: "string", example: "Room 102" },
          seatingCapacity: { type: "integer", example: 121 },
          roomTypeReference: { $ref: "#/components/schemas/RoomType" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          __v: { type: "integer", example: 0 },
        },
      },
      ClassSeries: {
        type: "object",
        properties: {
          _id: { type: "string" },
          classTitle: { type: "string", example: "Introduction to JavaScript" },
          recurrenceType: {
            type: "string",
            enum: ["none", "daily", "weekly", "monthly"],
          },
          seriesStartDate: { type: "string", format: "date-time" },
          seriesEndDate: { type: "string", format: "date-time" },
          dailyTimeSlots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                startTime24h: { type: "string", example: "09:00" },
                endTime24h: { type: "string", example: "10:00" },
                _id: { type: "string" },
              },
            },
          },
          preGeneratedClassSessions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                sessionStartDateTime: { type: "string", format: "date-time" },
                sessionEndDateTime: { type: "string", format: "date-time" },
                _id: { type: "string" },
              },
            },
          },
          instructor: { $ref: "#/components/schemas/Instructor" },
          room: { $ref: "#/components/schemas/PhysicalRoom" },
        },
      },

      /* --- INPUT SCHEMAS --- */
      InstructorInput: {
        type: "object",
        required: ["name", "email"],
        properties: { name: { type: "string" }, email: { type: "string" } },
      },
      RoomTypeInput: {
        type: "object",
        required: ["roomTypeName"],
        properties: { roomTypeName: { type: "string" } },
      },
      PhysicalRoomInput: {
        type: "object",
        required: ["roomName", "seatingCapacity", "roomTypeReference"],
        properties: {
          roomName: { type: "string" },
          seatingCapacity: { type: "integer" },
          roomTypeReference: {
            type: "string",
            description: "MongoID of RoomType",
          },
        },
      },
      ClassSeriesInput: {
        type: "object",
        required: [
          "classTitle",
          "assignedInstructor",
          "assignedRoom",
          "recurrenceType",
          "seriesStartDate",
        ],
        properties: {
          classTitle: { type: "string" },
          assignedInstructor: { type: "string" },
          assignedRoom: { type: "string" },
          recurrenceType: {
            type: "string",
            enum: ["none", "daily", "weekly", "monthly"],
          },
          seriesStartDate: { type: "string", format: "date" },
          seriesEndDate: { type: "string", format: "date" },
          dailyTimeSlots: {
            type: "array",
            items: {
              type: "object",
              properties: {
                startTime24h: { type: "string" },
                endTime24h: { type: "string" },
              },
            },
          },
        },
      },
    },
    /* --- COMMON RESPONSE STRUCTURES --- */
    responses: {
      SuccessList: {
        description: "A paginated list of records",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                message: { type: "string" },
                data: { type: "array", items: { type: "object" } },
                pagination: { $ref: "#/components/schemas/Pagination" },
              },
            },
          },
        },
      },
      SuccessSingle: {
        description: "A single record response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                message: { type: "string" },
                data: { type: "object" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    /* --- INSTRUCTORS --- */
    "/instructors": {
      get: {
        tags: ["Instructors"],
        summary: "Fetch all instructors",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
            description: "Page number",
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
            description: "Items per page",
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessList" } },
      },
      post: {
        tags: ["Instructors"],
        summary: "Create new instructor",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InstructorInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },
    "/instructors/{id}": {
      put: {
        tags: ["Instructors"],
        summary: "Update instructor details",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/InstructorInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
      delete: {
        tags: ["Instructors"],
        summary: "Remove instructor from system",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },

    /* --- ROOM TYPES --- */
    "/rooms/types": {
      get: {
        tags: ["Room Management"],
        summary: "Fetch all room categories",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessList" } },
      },
      post: {
        tags: ["Room Management"],
        summary: "Create a room category",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoomTypeInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },
    "/rooms/types/{id}": {
      put: {
        tags: ["Room Management"],
        summary: "Update room category",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RoomTypeInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
      delete: {
        tags: ["Room Management"],
        summary: "Delete room category",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },

    /* --- PHYSICAL ROOMS --- */
    "/rooms/physical": {
      get: {
        tags: ["Room Management"],
        summary: "Fetch all physical rooms",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessList" } },
      },
      post: {
        tags: ["Room Management"],
        summary: "Register a physical room",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PhysicalRoomInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },
    "/rooms/physical/{id}": {
      put: {
        tags: ["Room Management"],
        summary: "Update physical room details",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PhysicalRoomInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
      delete: {
        tags: ["Room Management"],
        summary: "Remove room from system",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },

    /* --- CLASSES --- */
    "/classes": {
      get: {
        tags: ["Classes"],
        summary: "Fetch class schedules (Calendar source)",
        parameters: [
          {
            in: "query",
            name: "page",
            schema: { type: "integer", default: 1 },
          },
          {
            in: "query",
            name: "limit",
            schema: { type: "integer", default: 10 },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessList" } },
      },
      post: {
        tags: ["Classes"],
        summary: "Create a recurring class series",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClassSeriesInput" },
            },
          },
        },
        responses: {
          200: { $ref: "#/components/responses/SuccessSingle" },
          400: {
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/classes/{id}": {
      put: {
        tags: ["Classes"],
        summary: "Update entire class series",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClassSeriesInput" },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
      delete: {
        tags: ["Classes"],
        summary: "Delete entire series",
        parameters: [
          {
            in: "path",
            name: "id",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },
    "/classes/{seriesId}/instances/{sessionId}": {
      patch: {
        tags: ["Classes"],
        summary: "Detach & update single session",
        parameters: [
          { in: "path", name: "seriesId", required: true },
          { in: "path", name: "sessionId", required: true },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                  newStart: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
      delete: {
        tags: ["Classes"],
        summary: "Cancel single session instance",
        parameters: [
          { in: "path", name: "seriesId", required: true },
          { in: "path", name: "sessionId", required: true },
        ],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { reason: { type: "string" } },
              },
            },
          },
        },
        responses: { 200: { $ref: "#/components/responses/SuccessSingle" } },
      },
    },
  },
}

const options = {
  swaggerDefinition,
  apis: [],
}

const swaggerSpec = swaggerJSDoc(options)
export default swaggerSpec
