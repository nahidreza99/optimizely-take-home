// Load environment variables before importing anything
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root (one level up from scripts/)
config({ path: resolve(__dirname, "../.env.local") });
config({ path: resolve(__dirname, "../.env") }); // Fallback to .env

// Dynamically import the server after environment variables are loaded
async function main() {
  const { createSocketIOServer } = await import("../lib/websocket/server");

  // Start the Socket.io server
  createSocketIOServer();

  // Handle graceful shutdown
  process.on("SIGTERM", async () => {
    console.log("SIGTERM received, shutting down Socket.io server...");
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.log("SIGINT received, shutting down Socket.io server...");
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Error starting Socket.io server:", error);
  process.exit(1);
});
