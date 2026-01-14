// Initialize default content types
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root
config({ path: resolve(__dirname, "../.env") });

async function initContentTypes() {
  try {
    // Import after env is loaded
    const connectDB = (await import("../lib/db/mongodb")).default;
    const ContentType = (await import("../lib/models/ContentType")).default;

    // Connect to database
    await connectDB();
    console.log("Connected to MongoDB");

    // Default content types to create
    const defaultContentTypes = [
      { title: "Blog Post Outline" },
      { title: "Product Description" },
      { title: "Social Media Caption" },
    ];

    // Create content types if they don't exist
    for (const contentTypeData of defaultContentTypes) {
      const existing = await ContentType.findOne({ title: contentTypeData.title });
      if (!existing) {
        await ContentType.create(contentTypeData);
        console.log(`Created content type: ${contentTypeData.title}`);
      } else {
        console.log(`Content type already exists: ${contentTypeData.title}`);
      }
    }

    console.log("Content types initialization completed");
    process.exit(0);
  } catch (error) {
    console.error("Error initializing content types:", error);
    process.exit(1);
  }
}

initContentTypes();
