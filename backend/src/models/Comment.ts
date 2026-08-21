import { Schema, model, Document, Types } from "mongoose";

export interface IComment extends Document {
  _id: Types.ObjectId;
  ticket: Types.ObjectId;
  author: Types.ObjectId;
  authorRole: "CUSTOMER" | "AGENT";
  text: string;
  createdAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    ticket: { type: Schema.Types.ObjectId, ref: "Ticket", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    authorRole: { type: String, enum: ["CUSTOMER", "AGENT"], required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Comment = model<IComment>("Comment", commentSchema);
