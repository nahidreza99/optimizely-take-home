import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import AIJob from "@/lib/models/AIJob";
import GeneratedContent from "@/lib/models/GeneratedContent";
import { verifyAuth } from "@/lib/middleware/auth";
import mongoose from "mongoose";

// GET - Get generated content by AIJob ID
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

    // First verify that the job exists and belongs to the user
    const job = await AIJob.findById(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify that the job belongs to the authenticated user
    if (job.user.toString() !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - Job does not belong to user" },
        { status: 403 }
      );
    }

    // Find generated content for this job
    const generatedContent = await GeneratedContent.findOne({ job: id });

    if (!generatedContent) {
      return NextResponse.json(
        {
          error: "Generated content not found",
          message:
            "Content has not been generated yet. The job may still be pending or failed.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: generatedContent._id.toString(),
          job_id: generatedContent.job.toString(),
          user: generatedContent.user.toString(),
          content_type: generatedContent.content_type,
          prompt: generatedContent.prompt,
          response: generatedContent.response,
          created_at: generatedContent.created_at,
          updated_at: generatedContent.updated_at,
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
