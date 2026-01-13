"use client";
import React, { useState } from "react";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";

export default function Home() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, isLoading: authLoading } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(emailOrPhone, password);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="flex items-center min-h-screen w-full py-32 px-16 bg-background">
        <div className="hidden sm:block w-1/2"></div>
        <div className="flex justify-center items-center w-1/2">
          <Card className="p-8">
            <CardHeader className="px-0">
              <CardTitle>Login</CardTitle>
            </CardHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <FormField label="Email or Phone" error={error}>
                <Input
                  type="text"
                  placeholder="Enter your email or phone"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </FormField>
              <FormField label="Password">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </FormField>
              <Button
                type="submit"
                className="w-full border dark:bg-white dark:text-black"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="text-primary underline">
                  Register Here
                </Link>
              </span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
