import mongoose, { Schema, Document } from "mongoose";

const educationSchema = new mongoose.Schema(
  {
    institution: { type: String},
    period: { type: String},
    major: { type: String},
    gpa: { type: String },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String },
    description: { type: String },
  },
  { _id: false }
);

export interface IEnrollment extends Document {
  studentName: string;
  studentEmail: string;
  courseId: mongoose.Types.ObjectId;
  cvBirthday: string;
  cvPhone: string;
  cvEducation: {
    institution: string;
    period: string;
    major: string;
    gpa: string;
  };
  cvExperience: string;
  cvSkills: string[];
  cvCertifications?: string[];
  cvProjects?: { name: string; description: string }[];
  cvFileUrl?: string;
  status: "pending" | "approved" | "rejected";
  enrolledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    studentName: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },

    studentEmail: {
      type: String,
      required: [true, "Student email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
    },

    cvBirthday: { type: String },
    cvPhone: {
      type: String,
      match: [/^\d{8,15}$/, "Phone must be 8–15 digits"],
    },

    cvEducation: { type: educationSchema },

    cvExperience: { type: String },

    cvSkills: {
      type: [String],
      validate: {
        validator: (arr: string[]) => arr.every((x) => x.trim().length > 0),
        message: "Each skill must be a non-empty string",
      },
    },

    cvCertifications: { type: [String] },

    cvProjects: { type: [projectSchema] },

    cvFileUrl: { type: String },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentEmail: 1, courseId: 1 }, { unique: true });

export default mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);
