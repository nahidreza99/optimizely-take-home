import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeedback extends Document {
  generated_content: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  rating: number; // 1-5 stars
  comment?: string;
  sentiment?: "positive" | "neutral" | "negative";
  created_at: Date;
  updated_at: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    generated_content: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedContent",
      required: [true, "Generated content is required"],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    sentiment: {
      type: String,
      enum: ["positive", "neutral", "negative"],
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Ensure one feedback per user per generated content
FeedbackSchema.index({ generated_content: 1, user: 1 }, { unique: true });

// Delete the model if it already exists to ensure we use the updated schema
if (mongoose.models.Feedback) {
  delete mongoose.models.Feedback;
}
const mongooseWithSchemas = mongoose as {
  modelSchemas?: Record<string, unknown>;
};
if (mongooseWithSchemas.modelSchemas?.Feedback) {
  delete mongooseWithSchemas.modelSchemas.Feedback;
}

const Feedback: Model<IFeedback> =
  mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
