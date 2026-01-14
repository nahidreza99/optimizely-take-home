"use client";

import { io, Socket } from "socket.io-client";

const ACCESS_TOKEN_KEY = "accessToken";

export interface JobUpdateEvent {
  jobId: string;
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

let socketInstance: Socket | null = null;

export function getSocketClient(): Socket | null {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:3001";
  
  if (!socketInstance) {
    // Get access token from localStorage
    const token = typeof window !== "undefined" 
      ? localStorage.getItem(ACCESS_TOKEN_KEY) 
      : null;

    if (!token) {
      console.warn("No access token found, cannot create Socket.io connection");
      return null;
    }

    socketInstance = io(socketUrl, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("Socket.io client connected");
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("Socket.io client disconnected:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("Socket.io connection error:", error);
    });
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
