import mongoose, { Schema, Document } from "mongoose";

export type GrammarAuditAction = "upload" | "delete";

export interface IGrammarAuditLog extends Document {
  action: GrammarAuditAction;
  documentId?: mongoose.Types.ObjectId;
  documentTitle?: string;
  userId: mongoose.Types.ObjectId;
  userRole: string;
  centerId?: string;
  createdAt: Date;
}

const grammarAuditLogSchema = new Schema<IGrammarAuditLog>(
  {
    action: { type: String, enum: ["upload", "delete"], required: true },
    documentId: { type: Schema.Types.ObjectId, ref: "GrammarDocument" },
    documentTitle: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    userRole: { type: String, required: true },
    centerId: { type: String, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

grammarAuditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IGrammarAuditLog>("GrammarAuditLog", grammarAuditLogSchema);
