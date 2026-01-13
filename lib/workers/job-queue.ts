import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import connectDB from "@/lib/db/mongodb";
import AIJob, { IAIJob } from "@/lib/models/AIJob";

const QUEUE_EXECUTION_DELAY = parseInt(
  process.env.QUEUE_EXECUTION_DELAY || "0",
  10
);
const MAX_JOB_RETRIES = parseInt(process.env.MAX_JOB_RETRIES || "3", 10);
const POLL_INTERVAL = 5000; // Poll every 5 seconds

// Process a single job
async function processJob(aiJob: IAIJob) {
  // Execute the job
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  console.log(`Task executed successfully at ${timestamp}`);

  // Randomly determine success or failure (0 or 1)
  const randomResult = Math.floor(Math.random() * 2); // 0 or 1

  if (randomResult === 1) {
    // Success
    aiJob.status = "success";
    await aiJob.save();
    console.log(`Job ${aiJob._id} completed successfully`);
  } else {
    // Failure - check retry count
    if (aiJob.retry_count < MAX_JOB_RETRIES) {
      // Retry the job - reset to pending and increment retry count
      aiJob.retry_count += 1;
      aiJob.status = "pending";
      // Reset created_at to current time so it can be retried after delay
      aiJob.created_at = new Date();
      await aiJob.save();
      console.log(
        `Job ${aiJob._id} failed, will retry (${aiJob.retry_count}/${MAX_JOB_RETRIES})`
      );
    } else {
      // Max retries reached
      aiJob.status = "failed";
      await aiJob.save();
      console.log(`Job ${aiJob._id} failed after ${MAX_JOB_RETRIES} retries`);
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

  const connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker(
    "ai-generation",
    async (job: Job) => {
      // This worker just adds jobs to the queue
      // Actual processing is done by the database poller
      console.log(`Job ${job.id} added to queue`);
      return { jobId: job.id };
    },
    {
      connection,
      concurrency: 10,
    }
  );

  worker.on("completed", (job: Job) => {
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
