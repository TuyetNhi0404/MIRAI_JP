import mongoose, { Schema, Document } from "mongoose";

export interface IGrammarChunk extends Document {
  documentId: mongoose.Types.ObjectId;
  centerId: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  pageNumber: number;
  text: string;
  embedding: number[];
  createdAt: Date;
  updatedAt: Date;
}

const grammarChunkSchema = new Schema<IGrammarChunk>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: "GrammarDocument", required: true },
    centerId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      required: true,
      index: true
    },
    pageNumber: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr: number[]) => arr.length > 0,
        message: "Embedding cannot be empty"
      }
    }
  },
  { timestamps: true }
);

// Compound index for RAG queries filtered by center and level
grammarChunkSchema.index({ centerId: 1, level: 1 });

export default mongoose.model<IGrammarChunk>("GrammarChunk", grammarChunkSchema);
