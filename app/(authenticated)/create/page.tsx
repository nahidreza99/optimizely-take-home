"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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

export default function CreatePage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [selectedContentType, setSelectedContentType] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingContentTypes, setIsLoadingContentTypes] = useState(true);
  const [error, setError] = useState<string>("");
  const router = useRouter();
  const { accessToken } = useAuth();

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
      // Redirect to dashboard for now
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
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
              disabled={isLoadingContentTypes || isLoading}
            >
              <SelectTrigger id="content-type" className="w-full">
                <SelectValue placeholder="Select a content type" />
              </SelectTrigger>
              <SelectContent>
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
              disabled={isLoading}
              rows={6}
              className="resize-none"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || isLoadingContentTypes}
            className="w-full"
          >
            {isLoading ? "Creating..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
