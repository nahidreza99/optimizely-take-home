import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import AIJob from "@/lib/models/AIJob";
import { verifyAuth } from "@/lib/middleware/auth";
import mongoose from "mongoose";

// GET - Get job status by ID
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
      return NextResponse.json(
        { error: "Invalid job ID" },
        { status: 400 }
      );
    }

    const job = await AIJob.findById(id);

    if (!job) {
      return NextResponse.json(
        { error: "Job not found" },
        { status: 404 }
      );
    }

    // Verify that the job belongs to the authenticated user
    if (job.user.toString() !== userId) {
      return NextResponse.json(
        { error: "Unauthorized - Job does not belong to user" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        data: {
          id: job._id.toString(),
          user: job.user.toString(),
          content_type: job.content_type,
          prompt: job.prompt,
          job_id: job.job_id,
          status: job.status,
          retry_count: job.retry_count,
          created_at: job.created_at,
          updated_at: job.updated_at,
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
