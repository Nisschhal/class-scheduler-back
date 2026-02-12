import { Schema, model, Document, Types } from "mongoose"

/**
 * ROOM TYPE MODEL
 * Why: This is the CATEGORY (e.g., "Science Lab", "Lecture Hall").
 * Requirement: "CRUD for room type"
 */
export interface IRoomType extends Document {
  roomTypeName: string
}

const RoomTypeSchema = new Schema<IRoomType>(
  {
    roomTypeName: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
)

/**
 * PHYSICAL ROOM MODEL
 * Why: This is the ACTUAL LOCATION (e.g., "Room 101", "Building B - Hall 2").
 * This is where we check for scheduling conflicts.
 */
export interface IPhysicalRoom extends Document {
  roomName: string
  roomTypeReference: Types.ObjectId // Links to RoomType
  seatingCapacity: number
}

const PhysicalRoomSchema = new Schema<IPhysicalRoom>(
  {
    roomName: { type: String, required: true, unique: true, trim: true },
    roomTypeReference: {
      type: Schema.Types.ObjectId,
      ref: "RoomType",
      required: true,
    },
    seatingCapacity: { type: Number, required: true },
  },
  { timestamps: true },
)

export const RoomType = model<IRoomType>("RoomType", RoomTypeSchema)
export const PhysicalRoom = model<IPhysicalRoom>(
  "PhysicalRoom",
  PhysicalRoomSchema,
)
