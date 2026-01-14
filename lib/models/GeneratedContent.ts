import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGeneratedContent extends Document {
  job: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  response: string;
  content_type: string;
  prompt: string;
  created_at: Date;
  updated_at: Date;
}

const GeneratedContentSchema = new Schema<IGeneratedContent>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "AIJob",
      required: [true, "Job is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    response: {
      type: String,
      required: [true, "Response is required"],
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
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Unique index on job field to enforce one-to-one relationship
GeneratedContentSchema.index({ job: 1 }, { unique: true });

// Delete the model if it already exists to ensure we use the updated schema
if (mongoose.models.GeneratedContent) {
  delete mongoose.models.GeneratedContent;
}
const mongooseWithSchemas = mongoose as {
  modelSchemas?: Record<string, unknown>;
};
if (mongooseWithSchemas.modelSchemas?.GeneratedContent) {
  delete mongooseWithSchemas.modelSchemas.GeneratedContent;
}

const GeneratedContent: Model<IGeneratedContent> =
  mongoose.models.GeneratedContent ||
  mongoose.model<IGeneratedContent>("GeneratedContent", GeneratedContentSchema);

export { IGeneratedContent };
export default GeneratedContent;
