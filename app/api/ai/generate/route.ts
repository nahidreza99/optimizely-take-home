import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/mongodb";
import AIJob from "@/lib/models/AIJob";
import { verifyAuth } from "@/lib/middleware/auth";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { GoogleGenAI } from "@google/genai";

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

// Initialize Gemini AI client
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// Generate a short title from prompt
async function generateTitle(prompt: string): Promise<string | null> {
  try {
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a short title (maximum 50 characters) for this prompt. Respond with ONLY the title, no additional text:\n\nPrompt: "${prompt}"`,
    });

    if (!response || !response.text) {
      console.error("Error generating title: response.text is undefined");
      return null;
    }

    const title = response.text.trim();
    // Limit to 50 characters
    return title.length > 50 ? title.substring(0, 50) : title || null;
  } catch (error) {
    console.error("Error generating title:", error);
    // Return null on error (title is optional)
    return null;
  }
}

// GET - Get success jobs for authenticated user
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify authentication
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract pagination query parameters
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    // Validate and set defaults
    let limit = 20; // default
    let offset = 0; // default

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 100); // max 100
      }
    }

    if (offsetParam) {
      const parsedOffset = parseInt(offsetParam, 10);
      if (!isNaN(parsedOffset) && parsedOffset >= 0) {
        offset = parsedOffset;
      }
    }

    // Query saved success jobs for the authenticated user
    const query = {
      user: userId,
      status: "success",
      saved: true,
    };

    // Get total count for pagination metadata
    const total = await AIJob.countDocuments(query);

    // Fetch paginated jobs
    const jobs = await AIJob.find(query)
      .sort({ created_at: -1 }) // Most recent first
      .limit(limit)
      .skip(offset)
      .lean();

    // Calculate hasMore
    const hasMore = offset + jobs.length < total;

    return NextResponse.json(
      {
        data: jobs.map((job) => ({
          id: job._id.toString(),
          job_id: job.job_id,
          content_type: job.content_type,
          prompt: job.prompt,
          title: job.title || null,
          created_at: job.created_at,
          updated_at: job.updated_at,
        })),
        count: jobs.length,
        total,
        limit,
        offset,
        hasMore,
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

    // Generate title from prompt
    const title = await generateTitle(body.prompt);

    // Create job record in database
    const job = await AIJob.create({
      user: userId,
      content_type: body.content_type,
      prompt: body.prompt,
      job_id: null,
      status: "pending",
      retry_count: 0,
      title: title,
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
