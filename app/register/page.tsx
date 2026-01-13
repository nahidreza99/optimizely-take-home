"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { RegisterInput } from "@/lib/validations/auth";

export default function RegisterPage() {
  const [formData, setFormData] = useState<RegisterInput>({
    firstName: "",
    lastName: "",
    emailOrPhone: "",
    dateOfBirth: "",
    // @ts-expect-error: no default value for gender
    gender: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { register, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Clear password error if passwords match after update
      if (name === "password") {
        setPasswordError("");
      }

      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPasswordError("");

    // Validate password length
    if (formData.password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailOrPhone: formData.emailOrPhone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        password: formData.password,
      });
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
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <h1 className="text-xl font-semibold">Register</h1>
      </header>
      <div className="flex flex-1 items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Create an Account</CardTitle>
            <CardDescription>
              Fill in your information to register
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  label="First Name"
                  error={
                    error && formData.firstName === ""
                      ? "First name is required"
                      : undefined
                  }
                >
                  <Input
                    type="text"
                    name="firstName"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </FormField>
                <FormField
                  label="Last Name"
                  error={
                    error && formData.lastName === ""
                      ? "Last name is required"
                      : undefined
                  }
                >
                  <Input
                    type="text"
                    name="lastName"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    disabled={isLoading}
                  />
                </FormField>
              </div>

              <FormField
                label="Email or Phone"
                error={
                  error && formData.emailOrPhone === ""
                    ? "Email or phone is required"
                    : undefined
                }
              >
                <Input
                  type="text"
                  name="emailOrPhone"
                  placeholder="Enter your email or phone number"
                  value={formData.emailOrPhone}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </FormField>

              <FormField
                label="Date of Birth"
                error={
                  error && formData.dateOfBirth === ""
                    ? "Date of birth is required"
                    : undefined
                }
              >
                <Input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </FormField>

              <FormField
                label="Gender"
                error={
                  error && !formData.gender ? "Gender is required" : undefined
                }
              >
                <Select
                  value={formData.gender}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      gender: value as
                        | "male"
                        | "female"
                        | "other"
                        | "prefer-not-to-say",
                    })
                  }
                  required
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem className="hover:bg-muted" value="male">
                      Male
                    </SelectItem>
                    <SelectItem className="hover:bg-muted" value="female">
                      Female
                    </SelectItem>
                    <SelectItem className="hover:bg-muted" value="other">
                      Other
                    </SelectItem>
                    <SelectItem
                      className="hover:bg-muted"
                      value="prefer-not-to-say"
                    >
                      Prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Password"
                error={
                  passwordError && passwordError.includes("at least")
                    ? passwordError
                    : undefined
                }
              >
                <Input
                  type="password"
                  name="password"
                  placeholder="Password (min 6 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  disabled={isLoading}
                />
              </FormField>

              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Registering..." : "Register"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <span className="text-muted-foreground">
                Already have an account?{" "}
              </span>
              <Link href="/" className="text-primary hover:underline">
                Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
