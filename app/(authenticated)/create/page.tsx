"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/lib/contexts/AuthContext";

interface ContentType {
  _id: string;
  title: string;
  average_token_weight: number | null;
  created_at: string;
  updated_at: string;
}

interface JobStatus {
  id: string;
  status: "pending" | "success" | "failed";
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
  const [buttonState, setButtonState] = useState<
    "continue" | "scheduled" | "creating"
  >("continue");
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const QUEUE_EXECUTION_DELAY = parseInt(
      process.env.NEXT_PUBLIC_QUEUE_EXECUTION_DELAY || "60",
      10
    );
    const POLL_INTERVAL = 2000; // Poll every 2 seconds

    const pollJobStatus = async () => {
      try {
        const response = await fetch(`/api/ai/job/${jobId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch job status");
        }

        const data = await response.json();
        const status: JobStatus = data.data;

        // Calculate when the delay period ends
        const createdAt = new Date(status.created_at).getTime();
        const delayEndTime = createdAt + QUEUE_EXECUTION_DELAY * 1000;
        const now = Date.now();

        // Determine button state
        if (now < delayEndTime) {
          // Still in scheduled period
          setButtonState("scheduled");
        } else if (status.status === "pending") {
          // Delay passed but still processing
          setButtonState("creating");
        } else if (status.status === "success") {
          // Job completed successfully
          setButtonState("continue");
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Fetch generated content
          try {
            const contentResponse = await fetch(`/api/ai/job/${jobId}/content`);
            if (contentResponse.ok) {
              // Content is ready, redirect to dashboard
              router.push("/dashboard");
            } else {
              // Content not ready yet, keep polling or show error
              setError("Content is not ready yet. Please wait...");
            }
          } catch (contentErr) {
            console.error("Error fetching content:", contentErr);
            setError("Failed to fetch generated content");
          }
        } else if (status.status === "failed") {
          // Job failed
          setButtonState("continue");
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError("Job failed. Please try again.");
        }
      } catch (err) {
        console.error("Error polling job status:", err);
        // Don't stop polling on error, just log it
      }
    };

    // Start polling immediately, then every POLL_INTERVAL
    pollJobStatus();
    pollingIntervalRef.current = setInterval(pollJobStatus, POLL_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [jobId, router]);

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
      // Store job ID to start polling
      setJobId(data.data.id);
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
