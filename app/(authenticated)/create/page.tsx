"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getSocketClient, JobUpdateEvent } from "@/lib/websocket/client";
import { Socket } from "socket.io-client";

interface ContentType {
  _id: string;
  title: string;
  average_token_weight: number | null;
  created_at: string;
  updated_at: string;
}

interface JobContent {
  id: string;
  job_id: string;
  user: string;
  content_type: string;
  prompt: string;
  response: string;
  created_at: string;
  updated_at: string;
}

export default function CreatePage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContentTypes, setIsLoadingContentTypes] = useState(true);
  const [error, setError] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobContent, setJobContent] = useState<JobContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [buttonState, setButtonState] = useState<
    "continue" | "scheduled" | "creating"
  >("continue");
  const jobCreatedAtRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const router = useRouter();
  useAuth(); // Ensure auth context is available

  // Fetch content types on page load
  useEffect(() => {
    const fetchContentTypes = async () => {
      try {
        setIsLoadingContentTypes(true);
        const response = await fetch("/api/content-types");
        if (!response.ok) {
          throw new Error("Failed to fetch content types");
        }
        const data = await response.json();
        setContentTypes(data.data || []);
      } catch (err) {
        console.error("Error fetching content types:", err);
        setError("Failed to load content types");
      } finally {
        setIsLoadingContentTypes(false);
      }
    };

    fetchContentTypes();
  }, []);

  // WebSocket connection for job status updates
  useEffect(() => {
    if (!jobId) return;

    const QUEUE_EXECUTION_DELAY = parseInt(
      process.env.NEXT_PUBLIC_QUEUE_EXECUTION_DELAY || "60",
      10
    );

    // Get or create socket connection
    const socket = getSocketClient();
    if (!socket) {
      console.error("Failed to get Socket.io client");
      setError("Failed to connect to job status service");
      return;
    }

    socketRef.current = socket;

    // Subscribe to job updates
    socket.emit("subscribe:job", jobId);

    // Calculate initial button state based on creation time
    if (jobCreatedAtRef.current) {
      const delayEndTime =
        jobCreatedAtRef.current + QUEUE_EXECUTION_DELAY * 1000;
      const now = Date.now();
      if (now < delayEndTime) {
        setButtonState("scheduled");
      }
    }

    // Listen for job update events
    const handleJobUpdate = (event: JobUpdateEvent) => {
      if (event.jobId !== jobId) {
        return; // Ignore updates for other jobs
      }

      if (jobCreatedAtRef.current) {
        const delayEndTime =
          jobCreatedAtRef.current + QUEUE_EXECUTION_DELAY * 1000;
        const now = Date.now();

        // Determine button state
        if (now < delayEndTime) {
          // Still in scheduled period
          setButtonState("scheduled");
        } else if (event.status === "pending") {
          // Delay passed but still processing
          setButtonState("creating");
        } else if (event.status === "success") {
          // Job completed successfully
          setButtonState("continue");

          // Set job content from event if available
          if (event.content) {
            setJobContent({
              id: event.content.id,
              job_id: jobId,
              user: "", // Not needed for display
              content_type: event.content.content_type,
              prompt: event.content.prompt,
              response: event.content.response,
              created_at: event.content.created_at,
              updated_at: event.content.updated_at,
            });
          } else {
            // Fallback: fetch content if not in event
            fetch(`/api/ai/job/${jobId}/content`)
              .then((res) => {
                if (res.ok) {
                  return res.json();
                }
                throw new Error("Failed to fetch content");
              })
              .then((data) => {
                setJobContent(data.data);
              })
              .catch((err) => {
                console.error("Error fetching content:", err);
                setError("Failed to fetch generated content");
              });
          }
        } else if (event.status === "failed") {
          // Job failed
          setButtonState("continue");
          setError("Job failed. Please try again.");
        }
      } else {
        // If we don't have creation time, just use status
        if (event.status === "success") {
          setButtonState("continue");
          if (event.content) {
            setJobContent({
              id: event.content.id,
              job_id: jobId,
              user: "",
              content_type: event.content.content_type,
              prompt: event.content.prompt,
              response: event.content.response,
              created_at: event.content.created_at,
              updated_at: event.content.updated_at,
            });
          }
        } else if (event.status === "failed") {
          setButtonState("continue");
          setError("Job failed. Please try again.");
        } else if (event.status === "pending") {
          setButtonState("creating");
        }
      }
    };

    socket.on("job:update", handleJobUpdate);

    // Cleanup on unmount or when jobId changes
    return () => {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("unsubscribe:job", jobId);
      }
      // Remove all handlers for this event since handleJobUpdate is recreated on each render
      if (socketRef.current) {
        socketRef.current.off("job:update");
      }
    };
  }, [jobId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedContentType) {
      setError("Please select a content type");
      return;
    }

    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsLoading(true);
    setButtonState("scheduled");

    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_type: selectedContentType,
          prompt: prompt.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create AI job");
      }

      const data = await response.json();
      // Store job ID and creation time for WebSocket subscription
      setJobId(data.data.id);
      jobCreatedAtRef.current = new Date(data.data.created_at).getTime();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
      setButtonState("continue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAbandon = () => {
    // Reset everything and go back to create form
    setJobId(null);
    setJobContent(null);
    setSelectedContentType("");
    setPrompt("");
    setError("");
    setButtonState("continue");
  };

  const handleSave = async () => {
    if (!jobId) return;

    try {
      setIsSaving(true);
      setError("");

      const response = await fetch(`/api/ai/job/${jobId}/save`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save job");
      }

      // Navigate to the job details page
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred while saving.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Show content when job is successful
  if (jobContent) {
    return (
      <div className="flex min-h-full flex-col">
        {/* Action buttons at top right */}
        <div className="mb-6 flex justify-end gap-3">
          <Button
            onClick={handleAbandon}
            variant="destructive"
            disabled={isSaving}
          >
            Abandon
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            variant="outline"
            className="text-white bg-black dark:bg-white dark:text-black border-border hover:bg-accent"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>

        {/* Content display */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Generated Content</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="markdown-content">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="mb-4 text-3xl font-bold">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mb-3 mt-6 text-2xl font-semibold">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-2 mt-4 text-xl font-semibold">
                      {children}
                    </h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="mb-2 mt-3 text-lg font-semibold">
                      {children}
                    </h4>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-7">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="mb-4 ml-6 list-disc space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="mb-4 ml-6 list-decimal space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7">{children}</li>
                  ),
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  pre: ({ children }) => (
                    <pre className="mb-4 overflow-x-auto rounded-lg bg-muted p-4">
                      {children}
                    </pre>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="mb-4 border-l-4 border-muted-foreground/30 pl-4 italic">
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ children, href }) => (
                    <a
                      href={href}
                      className="text-primary underline hover:text-primary/80"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="my-6 border-border" />,
                }}
              >
                {jobContent.response}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show form when no content is available
  return (
    <div className="flex min-h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <h1 className="text-center text-2xl font-semibold text-foreground">
          Enter your topic to get started
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="content-type"
              className="text-sm font-medium text-foreground"
            >
              Content Type
            </label>
            <Select
              value={selectedContentType}
              onValueChange={setSelectedContentType}
              disabled={
                isLoadingContentTypes ||
                isLoading ||
                buttonState === "scheduled" ||
                buttonState === "creating"
              }
            >
              <SelectTrigger id="content-type" className="w-full">
                <SelectValue placeholder="Select a content type" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                {isLoadingContentTypes ? (
                  <SelectItem value="loading" disabled>
                    Loading...
                  </SelectItem>
                ) : contentTypes.length === 0 ? (
                  <SelectItem value="empty" disabled>
                    No content types available
                  </SelectItem>
                ) : (
                  contentTypes.map((contentType) => (
                    <SelectItem key={contentType._id} value={contentType.title}>
                      {contentType.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="prompt"
              className="text-sm font-medium text-foreground"
            >
              Prompt
            </label>
            <Textarea
              id="prompt"
              placeholder="Enter your prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={
                isLoading ||
                buttonState === "scheduled" ||
                buttonState === "creating"
              }
              rows={6}
              className="resize-none"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={
              isLoading ||
              isLoadingContentTypes ||
              buttonState === "scheduled" ||
              buttonState === "creating"
            }
            className="w-full border"
          >
            <span className="flex items-center justify-center gap-2">
              {(buttonState === "scheduled" || buttonState === "creating") && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {buttonState === "scheduled"
                ? "Scheduled"
                : buttonState === "creating"
                ? "Creating"
                : isLoading
                ? "Creating..."
                : "Continue"}
            </span>
          </Button>
        </form>
      </div>
    </div>
  );
}
