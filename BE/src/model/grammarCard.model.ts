import mongoose, { Schema, Document } from "mongoose";

export interface IGrammarCardExample {
  japanese: string;
  furigana: string;
  vietnamese: string;
}

export interface IGrammarCard extends Document {
  centerId: string;
  level: "N5" | "N4" | "N3" | "N2" | "N1";
  title: string;
  structure: string;
  meaningVi: string;
  explanation: string;
  examples: IGrammarCardExample[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const grammarCardExampleSchema = new Schema<IGrammarCardExample>(
  {
    japanese:  { type: String, required: true },
    furigana:  { type: String, required: false, default: "" },  // AI đôi khi bỏ qua furigana
    vietnamese: { type: String, required: false, default: "" }
  },
  { _id: false }
);

const grammarCardSchema = new Schema<IGrammarCard>(
  {
    centerId: { type: String, required: true, index: true },
    level: {
      type: String,
      enum: ["N5", "N4", "N3", "N2", "N1"],
      required: true,
      index: true
    },
    title: { type: String, required: true, trim: true },
    structure: { type: String, required: true },
    meaningVi: { type: String, required: true },
    explanation: { type: String, required: true },
    examples: { type: [grammarCardExampleSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

grammarCardSchema.index({ centerId: 1, level: 1 });
// Phase 6: index theo createdAt cho date filter
grammarCardSchema.index({ centerId: 1, level: 1, createdAt: -1 });

export default mongoose.model<IGrammarCard>("GrammarCard", grammarCardSchema);
