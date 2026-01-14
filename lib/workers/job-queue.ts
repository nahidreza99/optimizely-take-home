import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { GoogleGenAI } from "@google/genai";
import connectDB from "@/lib/db/mongodb";
import AIJob, { IAIJob } from "@/lib/models/AIJob";
import GeneratedContent from "@/lib/models/GeneratedContent";

const QUEUE_EXECUTION_DELAY = parseInt(
  process.env.QUEUE_EXECUTION_DELAY || "0",
  10
);
const MAX_JOB_RETRIES = parseInt(process.env.MAX_JOB_RETRIES || "3", 10);
const POLL_INTERVAL = 5000; // Poll every 5 seconds

// Initialize Gemini AI client
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

// Process a single job
async function processJob(aiJob: IAIJob) {
  // Skip if job is already completed
  if (aiJob.status === "success") {
    // Check if GeneratedContent already exists to avoid duplicate processing
    // Comment this out to allow content re-generation
    const existingContent = await GeneratedContent.findOne({ job: aiJob._id });
    if (existingContent) {
      console.log(`Job ${aiJob._id} already completed, skipping`);
      return;
    }
  }

  try {
    // Construct prompt for Gemini
    const prompt = `Generate a ${aiJob.content_type} about: ${aiJob.prompt}`;

    // Call Gemini API
    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const generatedText = response.text;

    // Log success with timestamp
    // TODO: remove during deployment
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
    console.log(`Task executed successfully at ${timestamp}`);

    // Check if GeneratedContent already exists (race condition protection)
    const existingContent = await GeneratedContent.findOne({ job: aiJob._id });
    if (existingContent) {
      // Content already exists, just update job status if needed
      if (aiJob.status !== "success") {
        aiJob.status = "success";
        await aiJob.save();
      }
      console.log(
        `Job ${aiJob._id} already has generated content, marked as success`
      );
      return;
    }

    // Create GeneratedContent record
    try {
      await GeneratedContent.create({
        job: aiJob._id,
        user: aiJob.user,
        response: generatedText,
        content_type: aiJob.content_type,
        prompt: aiJob.prompt,
      });
    } catch (createError: unknown) {
      // Handle duplicate key error (race condition - another process created it)
      const mongoError = createError as {
        code?: number;
        keyPattern?: { job?: number };
      };
      if (mongoError?.code === 11000 && mongoError?.keyPattern?.job) {
        // Duplicate key on job field - content was already created
        console.log(
          `GeneratedContent already exists for job ${aiJob._id}, marking as success`
        );
        if (aiJob.status !== "success") {
          aiJob.status = "success";
          await aiJob.save();
        }
        return;
      }
      // Re-throw if it's a different error
      throw createError;
    }

    // Update job status to success
    aiJob.status = "success";
    await aiJob.save();

    // TODO: remove during deployment
    console.log(`Job ${aiJob._id} completed successfully`);
  } catch (error: unknown) {
    // TODO: remove during deployment
    // Handle API errors (network, rate limits, invalid API key, etc.)
    console.error(`Error processing job ${aiJob._id}:`, error);

    const errorObj = error as {
      status?: number;
      code?: number;
      message?: string;
    };

    // Check if error is MongoDB duplicate key (11000) - treat as success
    if (errorObj?.code === 11000) {
      const mongoError = error as { keyPattern?: { job?: number } };
      if (mongoError?.keyPattern?.job) {
        // Duplicate key on job field - content was already created successfully
        console.log(
          `GeneratedContent already exists for job ${aiJob._id}, marking as success`
        );
        aiJob.status = "success";
        await aiJob.save();
        return;
      }
    }

    // Check if error is 404 (model not found) - mark as non-retryable
    const isNonRetryable =
      errorObj?.status === 404 ||
      (errorObj?.message &&
        typeof errorObj.message === "string" &&
        errorObj.message.includes("404") &&
        errorObj.message.includes("Not Found"));

    if (isNonRetryable) {
      // Non-retryable error (e.g., invalid model name) - fail immediately
      aiJob.status = "failed";
      await aiJob.save();
      // TODO: remove during deployment
      console.log(
        `Job ${aiJob._id} failed with non-retryable error (404 - model not found)`
      );
      throw error;
    }

    // Check retry count for retryable errors
    if (aiJob.retry_count < MAX_JOB_RETRIES) {
      // Retry the job - reset to pending and increment retry count
      aiJob.retry_count += 1;
      aiJob.status = "pending";
      // Reset created_at to current time so it can be retried after delay
      aiJob.created_at = new Date();
      await aiJob.save();

      // TODO: remove during deployment
      console.log(
        `Job ${aiJob._id} failed, will retry (${aiJob.retry_count}/${MAX_JOB_RETRIES})`
      );
      // Re-throw error to trigger retry mechanism
      throw error;
    } else {
      // Max retries reached
      aiJob.status = "failed";
      await aiJob.save();

      // TODO: remove during deployment
      console.log(`Job ${aiJob._id} failed after ${MAX_JOB_RETRIES} retries`);
      throw error;
    }
  }
}

// Poll database for pending jobs that are ready to execute
async function pollPendingJobs() {
  try {
    await connectDB();

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - QUEUE_EXECUTION_DELAY * 1000);

    // Find pending jobs where created_at + QUEUE_EXECUTION_DELAY has passed
    const pendingJobs = await AIJob.find({
      status: "pending",
      created_at: { $lte: cutoffTime },
    }).limit(10); // Process up to 10 jobs at a time

    for (const job of pendingJobs) {
      try {
        await processJob(job);
      } catch (error) {
        console.error(`Error processing job ${job._id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error polling pending jobs:", error);
  }
}

// Initialize worker that processes BullMQ jobs
export function startAIGenerationWorker() {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  // Validate GEMINI_API_KEY on startup
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "ai-generation",
    async (job: Job) => {
      // This worker just adds jobs to the queue
      // Actual processing is done by the database poller
      // TODO: remove during deployment
      console.log(`Job ${job.id} added to queue`);
      return { jobId: job.id };
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on("completed", (job: Job) => {
    // TODO: uncomment during deployment
    // return;
    // TODO: remove during deployment
    console.log(`BullMQ job ${job.id} completed`);
  });

  worker.on("failed", (job: Job | undefined, err: Error) => {
    console.error(`BullMQ job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err: Error) => {
    console.error("Worker error:", err);
  });

  // Start polling database for pending jobs
  setInterval(pollPendingJobs, POLL_INTERVAL);
  console.log(
    `AI Generation Worker started. Polling every ${
      POLL_INTERVAL / 1000
    } seconds`
  );

  // Initial poll
  pollPendingJobs();

  return worker;
}

// If running as a standalone script
if (require.main === module) {
  startAIGenerationWorker();
}
