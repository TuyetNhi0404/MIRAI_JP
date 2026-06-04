import mongoose, { Schema, Document } from "mongoose";

export type GrammarDocumentScope = "private" | "shared";

export interface IGrammarDocument extends Document {
  title: string;
  filePath: string;
  centerId: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  status: "processing" | "completed" | "failed";
  processingStage: "queued" | "ocr" | "embed" | "extract" | "done" | "failed";
  totalPages: number;
  uploadedBy: mongoose.Types.ObjectId;
  scope: GrammarDocumentScope;
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
    processingStage: {
      type: String,
      enum: ["queued", "ocr", "embed", "extract", "done", "failed"],
      default: "queued"
    },
    totalPages: { type: Number, default: 0 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Phase 5: "private" = chỉ teacher upload thấy, "shared" = admin đánh dấu chia sẻ cho cả center
    scope: {
      type: String,
      enum: ["private", "shared"],
      default: "private"
    }
  },
  { timestamps: true }
);

// Phase 5: query theo (uploadedBy, centerId) cho teacher view
grammarDocumentSchema.index({ uploadedBy: 1, centerId: 1 });
grammarDocumentSchema.index({ uploadedBy: 1, createdAt: -1 });
// Phase 6: query theo createdAt cho date filter
grammarDocumentSchema.index({ centerId: 1, level: 1, createdAt: -1 });

export default mongoose.model<IGrammarDocument>("GrammarDocument", grammarDocumentSchema);
