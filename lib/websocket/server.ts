import { Server } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import { verifyAccessToken } from "@/lib/utils/jwt";

interface SocketAuth {
  userId: string;
  jobId?: string;
}

interface JobUpdateEvent {
  jobId: string;
  userId: string;
  status: "pending" | "success" | "failed";
  content?: {
    id: string;
    response: string;
    content_type: string;
    prompt: string;
    created_at: string;
    updated_at: string;
  };
}

export function createSocketIOServer() {
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }

  const redisSubscriber = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });

  // Store active connections: userId -> Set of socket IDs
  const userConnections = new Map<string, Set<string>>();
  // Store job subscriptions: socketId -> Set of jobIds
  const jobSubscriptions = new Map<string, Set<string>>();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== "string") {
        return next(new Error("Authentication token required"));
      }

      const payload = await verifyAccessToken(token);
      (socket.data as SocketAuth).userId = payload.userId;
      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const auth = socket.data as SocketAuth;
    const userId = auth.userId;

    // Track user connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socket.id);

    // Initialize job subscriptions for this socket
    jobSubscriptions.set(socket.id, new Set());

    console.log(`User ${userId} connected (socket: ${socket.id})`);

    // Handle job subscription
    socket.on("subscribe:job", (jobId: string) => {
      if (typeof jobId !== "string") {
        return;
      }

      const subscriptions = jobSubscriptions.get(socket.id);
      if (subscriptions) {
        subscriptions.add(jobId);
        console.log(`Socket ${socket.id} subscribed to job ${jobId}`);
      }
    });

    // Handle job unsubscription
    socket.on("unsubscribe:job", (jobId: string) => {
      const subscriptions = jobSubscriptions.get(socket.id);
      if (subscriptions) {
        subscriptions.delete(jobId);
        console.log(`Socket ${socket.id} unsubscribed from job ${jobId}`);
      }
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      const userSockets = userConnections.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userConnections.delete(userId);
        }
      }
      jobSubscriptions.delete(socket.id);
      console.log(`User ${userId} disconnected (socket: ${socket.id})`);
    });
  });

  // Subscribe to Redis pub/sub channel for job updates
  redisSubscriber.subscribe("job:updates");

  redisSubscriber.on("message", (channel, message) => {
    if (channel !== "job:updates") {
      return;
    }

    try {
      const event: JobUpdateEvent = JSON.parse(message);

      // Find all sockets subscribed to this job for this user
      const userSockets = userConnections.get(event.userId);
      if (!userSockets || userSockets.size === 0) {
        return;
      }

      // Emit to all sockets subscribed to this job
      userSockets.forEach((socketId) => {
        const subscriptions = jobSubscriptions.get(socketId);
        if (subscriptions && subscriptions.has(event.jobId)) {
          io.to(socketId).emit("job:update", {
            jobId: event.jobId,
            status: event.status,
            content: event.content,
          });
        }
      });
    } catch (error) {
      console.error("Error processing Redis message:", error);
    }
  });

  const port = parseInt(process.env.PORT || process.env.SOCKET_IO_PORT || "3001", 10);

  httpServer.listen(port, () => {
    console.log(`Socket.io server listening on port ${port}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down Socket.io server...");
    httpServer.close(() => {
      redisSubscriber.quit();
      io.close();
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return { io, httpServer };
}
