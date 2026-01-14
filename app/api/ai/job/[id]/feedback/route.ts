import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import Feedback from "@/lib/models/Feedback";
import GeneratedContent from "@/lib/models/GeneratedContent";
import AIJob from "@/lib/models/AIJob";
import { verifyAuth } from "@/lib/middleware/auth";
import mongoose from "mongoose";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini AI client
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// Analyze sentiment of feedback comment
async function analyzeSentiment(comment: string): Promise<"positive" | "neutral" | "negative"> {
  try {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the sentiment of this feedback comment and respond with ONLY one word: "positive", "neutral", or "negative".\n\nComment: "${comment}"`,
    });

    if (!response || !response.text) {
      console.error("Error analyzing sentiment: response.text is undefined");
      return "neutral";
    }

    const result = response.text.trim().toLowerCase();
    if (result.includes("positive")) {
      return "positive";
    } else if (result.includes("negative")) {
      return "negative";
    }
    return "neutral";
  } catch (error) {
    console.error("Error analyzing sentiment:", error);
    // Default to neutral on error
    return "neutral";
  }
}

// POST - Submit feedback for generated content
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.rating || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
      return NextResponse.json(
        { error: "Rating is required and must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    // Find the generated content by job ID
    const generatedContent = await GeneratedContent.findOne({ job: id });
    if (!generatedContent) {
      return NextResponse.json(
        { error: "Generated content not found" },
        { status: 404 }
      );
    }

    // Verify that the generated content belongs to the authenticated user
    if (generatedContent.user.toString() !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - Content does not belong to user" },
        { status: 403 }
      );
    }

    // Analyze sentiment if comment is provided
    let sentiment: "positive" | "neutral" | "negative" | undefined = undefined;
    if (body.comment && typeof body.comment === "string" && body.comment.trim()) {
      sentiment = await analyzeSentiment(body.comment.trim());
    }

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({
      generated_content: generatedContent._id,
      user: userId,
    });

    let feedback;
    if (existingFeedback) {
      // Update existing feedback
      existingFeedback.rating = body.rating;
      existingFeedback.comment = body.comment || undefined;
      existingFeedback.sentiment = sentiment;
      await existingFeedback.save();
      feedback = existingFeedback;
    } else {
      // Create new feedback
      feedback = await Feedback.create({
        generated_content: generatedContent._id,
        user: userId,
        rating: body.rating,
        comment: body.comment || undefined,
        sentiment: sentiment,
      });
    }

    return NextResponse.json(
      {
        message: "Feedback submitted successfully",
        data: {
          id: feedback._id.toString(),
          rating: feedback.rating,
          comment: feedback.comment,
          sentiment: feedback.sentiment,
          created_at: feedback.created_at,
          updated_at: feedback.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}

// GET - Get feedback for generated content
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    // Find the generated content by job ID
    const generatedContent = await GeneratedContent.findOne({ job: id });
    if (!generatedContent) {
      return NextResponse.json(
        { error: "Generated content not found" },
        { status: 404 }
      );
    }

    // Verify that the generated content belongs to the authenticated user
    if (generatedContent.user.toString() !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - Content does not belong to user" },
        { status: 403 }
      );
    }

    // Find feedback for this content
    const feedback = await Feedback.findOne({
      generated_content: generatedContent._id,
      user: userId,
    });

    if (!feedback) {
      return NextResponse.json(
        { message: "No feedback found", data: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: feedback._id.toString(),
          rating: feedback.rating,
          comment: feedback.comment,
          sentiment: feedback.sentiment,
          created_at: feedback.created_at,
          updated_at: feedback.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: "Internal server error", message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
