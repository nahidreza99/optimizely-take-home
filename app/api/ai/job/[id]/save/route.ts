import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import AIJob from "@/lib/models/AIJob";
import { verifyAuth } from "@/lib/middleware/auth";
import mongoose from "mongoose";

// POST - Save a job (set saved to true)
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

    // Find the job
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

    // Verify that the job status is "success"
    if (job.status !== "success") {
      return NextResponse.json(
        { error: "Only successful jobs can be saved" },
        { status: 400 }
      );
    }

    // Update the saved status to true
    job.saved = true;
    await job.save();

    return NextResponse.json(
      {
        message: "Job saved successfully",
        data: {
          id: job._id.toString(),
          saved: job.saved,
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
