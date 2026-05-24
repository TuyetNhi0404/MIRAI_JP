import mongoose, { Schema, Document } from "mongoose";

export type GrammarNoteStatus = "new" | "reviewing" | "mastered";

export interface IGrammarNote extends Document {
  userId: mongoose.Types.ObjectId;
  turnId?: string;
  sessionId?: string;
  original: string;
  corrected?: string;
  explanationVi?: string;
  tags: string[];
  severity?: "minor" | "should_fix" | "important";
  status: GrammarNoteStatus;
  level?: string;
  aiReplyContext?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GrammarNoteSchema = new Schema<IGrammarNote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    turnId: { type: String },
    sessionId: { type: String },
    original: { type: String, required: true },
    corrected: { type: String },
    explanationVi: { type: String },
    tags: { type: [String], default: [] },
    severity: {
      type: String,
      enum: ["minor", "should_fix", "important"],
    },
    status: {
      type: String,
      enum: ["new", "reviewing", "mastered"],
      default: "new",
    },
    level: { type: String },
    aiReplyContext: { type: String },
  },
  { timestamps: true },
);

GrammarNoteSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IGrammarNote>("GrammarNote", GrammarNoteSchema);
