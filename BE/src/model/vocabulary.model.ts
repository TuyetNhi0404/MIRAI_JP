import mongoose, { Document, Schema } from "mongoose";

export interface IVocabulary {
  word: string;
  reading: string;
  meaning: string;
  level: "N1" | "N2" | "N3" | "N4" | "N5";
  topic: string;
  example?: string;
  exampleMeaning?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IVocabularyDocument extends IVocabulary, Document {}

const vocabularySchema = new Schema<IVocabularyDocument>(
  {
    word: { type: String, required: true, trim: true },
    reading: { type: String, required: true, trim: true },
    meaning: { type: String, required: true, trim: true },
    level: {
      type: String,
      enum: ["N1", "N2", "N3", "N4", "N5"],
      required: true,
    },
    topic: { type: String, required: true, trim: true },
    example: { type: String, trim: true },
    exampleMeaning: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

// Index for fast filtering
vocabularySchema.index({ level: 1, topic: 1 });
vocabularySchema.index({ word: "text", meaning: "text" });

export const Vocabulary = mongoose.model<IVocabularyDocument>(
  "Vocabulary",
  vocabularySchema
);
