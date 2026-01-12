"use client";
import React, { useState } from "react";
import Image from "next/image";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    console.log(emailOrPhone, password);
    return; // TODO: add login logic later
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex items-center min-h-screen w-full py-32 px-16 bg-white dark:bg-black">
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
          </Card>
        </div>
      </main>
    </div>
  );
}
