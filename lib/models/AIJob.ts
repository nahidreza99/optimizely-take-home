import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAIJob extends Document {
  user: mongoose.Types.ObjectId;
  content_type: string;
  prompt: string;
  job_id: string | null;
  status: "pending" | "success" | "failed";
  retry_count: number;
  created_at: Date;
  updated_at: Date;
}

const AIJobSchema = new Schema<IAIJob>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    content_type: {
      type: String,
      required: [true, "Content type is required"],
      trim: true,
    },
    prompt: {
      type: String,
      required: [true, "Prompt is required"],
      trim: true,
    },
    job_id: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    retry_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Index for efficient querying of pending jobs
AIJobSchema.index({ status: 1, created_at: 1 });

// Delete the model if it already exists to ensure we use the updated schema
if (mongoose.models.AIJob) {
  delete mongoose.models.AIJob;
}
const mongooseWithSchemas = mongoose as {
  modelSchemas?: Record<string, unknown>;
};
if (mongooseWithSchemas.modelSchemas?.AIJob) {
  delete mongooseWithSchemas.modelSchemas.AIJob;
}

const AIJob: Model<IAIJob> =
  mongoose.models.AIJob || mongoose.model<IAIJob>("AIJob", AIJobSchema);

export { IAIJob };
export default AIJob;
