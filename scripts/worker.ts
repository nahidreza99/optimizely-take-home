import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get project root directory (one level up from scripts/)
const projectRoot = resolve(__dirname, "..");

// Load .env file
config({ path: resolve(projectRoot, ".env") });

// Use dynamic import to ensure env vars are loaded before importing worker
// which imports mongodb connection
(async () => {
  const { startAIGenerationWorker } = await import("../lib/workers/job-queue");

  // Start the worker
  const worker = startAIGenerationWorker();

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down worker...");
    await worker.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down worker...");
    await worker.close();
    process.exit(0);
  });
})();
