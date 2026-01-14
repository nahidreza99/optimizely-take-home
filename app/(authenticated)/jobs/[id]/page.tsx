"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from "lucide-react";

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

export default function JobPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();
  const [jobContent, setJobContent] = useState<JobContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const jobId = params?.id as string;

  const fetchJobContent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await fetch(`/api/ai/job/${jobId}/content`);

      if (!response.ok) {
        let errorMessage = "Failed to fetch job content";

        // Try to parse error response
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status-based messages
          if (response.status === 400) {
            errorMessage = "Invalid job ID";
          } else if (response.status === 401) {
            errorMessage = "Unauthorized - Please log in again";
          } else if (response.status === 403) {
            errorMessage = "You don't have permission to view this job";
          } else if (response.status === 404) {
            errorMessage =
              "Job content not found. The job may still be pending or failed.";
          } else if (response.status === 500) {
            errorMessage = "Internal server error - Please try again later";
          } else {
            errorMessage = `Failed to fetch job content (${response.status})`;
          }
        }

        setError(errorMessage);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!data.data) {
        setError("Invalid response format");
        setIsLoading(false);
        return;
      }

      setJobContent(data.data);
    } catch (err) {
      console.error("Error fetching job content:", err);
      if (err instanceof Error) {
        // Handle network errors
        if (err.message.includes("fetch")) {
          setError(
            "Network error - Please check your connection and try again"
          );
        } else {
          setError(err.message);
        }
      } else {
        setError("An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) {
      return;
    }

    if (!jobId) {
      setError("Job ID is required");
      setIsLoading(false);
      return;
    }

    fetchJobContent();
  }, [jobId, authLoading, fetchJobContent]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading job content...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    // Determine if error is retryable (network errors, 500 errors, etc.)
    const isRetryable =
      error.includes("Network error") ||
      error.includes("Internal server error") ||
      error.includes("try again");

    const handleRetry = () => {
      setError("");
      fetchJobContent();
    };

    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <CardTitle>Unable to Load Job Content</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {isRetryable && (
                <Button
                  onClick={handleRetry}
                  variant="default"
                  className="flex-1"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}
              <Button
                onClick={() => router.push("/dashboard")}
                variant={isRetryable ? "outline" : "default"}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!jobContent) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <p className="text-muted-foreground">No content found</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/dashboard")}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {jobContent.content_type}
            </CardTitle>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Prompt:</span> {jobContent.prompt}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {new Date(jobContent.created_at).toLocaleString()}
              </p>
            </div>
          </CardHeader>
        </Card>
      </div>

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
                  <ul className="mb-4 ml-6 list-disc space-y-2">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="mb-4 ml-6 list-decimal space-y-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => <li className="leading-7">{children}</li>,
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
