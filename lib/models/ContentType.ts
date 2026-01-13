import mongoose, { Schema, Document, Model } from "mongoose";

export interface IContentType extends Document {
  title: string;
  average_token_weight: number | null;
  created_at: Date;
  updated_at: Date;
}

const ContentTypeSchema = new Schema<IContentType>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    average_token_weight: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Delete the model if it already exists to ensure we use the updated schema
if (mongoose.models.ContentType) {
  delete mongoose.models.ContentType;
}
const mongooseWithSchemas = mongoose as {
  modelSchemas?: Record<string, unknown>;
};
if (mongooseWithSchemas.modelSchemas?.ContentType) {
  delete mongooseWithSchemas.modelSchemas.ContentType;
}

const ContentType: Model<IContentType> =
  mongoose.models.ContentType ||
  mongoose.model<IContentType>("ContentType", ContentTypeSchema);

export default ContentType;
