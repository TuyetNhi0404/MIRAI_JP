import mongoose, { Schema, Document } from "mongoose";

export interface IGrammarDocument extends Document {
  title: string;
  filePath: string;
  centerId: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  status: "processing" | "completed" | "failed";
  totalPages: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const grammarDocumentSchema = new Schema<IGrammarDocument>(
  {
    title: { type: String, required: true },
    filePath: { type: String, required: true },
    centerId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing"
    },
    totalPages: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default mongoose.model<IGrammarDocument>("GrammarDocument", grammarDocumentSchema);
