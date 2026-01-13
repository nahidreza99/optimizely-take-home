import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import AIJob from "@/lib/models/AIJob";
import { verifyAuth } from "@/lib/middleware/auth";
import { Queue } from "bullmq";
import Redis from "ioredis";

// Initialize BullMQ queue
const getQueue = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  return new Queue("ai-generation", {
    connection,
  });
};

// POST - Create a new AI generation job
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.content_type || typeof body.content_type !== "string") {
      return NextResponse.json(
        { error: "content_type is required and must be a string" },
        { status: 400 }
      );
    }

    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 }
      );
    }

    // Create job record in database
    const job = await AIJob.create({
      user: userId,
      content_type: body.content_type,
      prompt: body.prompt,
      job_id: null,
      status: "pending",
      retry_count: 0,
    });

    // Create BullMQ job (delayed execution will be handled by worker)
    const queue = getQueue();
    const bullJob = await queue.add(
      "generate",
      {
        jobId: job._id.toString(),
        userId: userId,
        content_type: body.content_type,
        prompt: body.prompt,
      },
      {
        jobId: job._id.toString(),
      }
    );

    // Update job with BullMQ job ID
    job.job_id = bullJob.id || null;
    await job.save();

    return NextResponse.json(
      {
        message: "AI generation job created successfully",
        data: {
          id: job._id.toString(),
          job_id: job.job_id,
          status: job.status,
          created_at: job.created_at,
        },
      },
      { status: 201 }
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
