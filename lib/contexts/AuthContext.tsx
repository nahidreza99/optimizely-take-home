"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  emailOrPhone: string;
  dateOfBirth: string;
  gender: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_TOKEN_KEY = "refreshToken";
const ACCESS_TOKEN_KEY = "accessToken";
const USER_KEY = "user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearAuth = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        return false;
      }

      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      return true;
    } catch (error) {
      console.error("Token refresh error:", error);
      clearAuth();
      return false;
    }
  }, []);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedRefreshToken && storedUser) {
          setUser(JSON.parse(storedUser));

          if (storedAccessToken) {
            // Verify access token is still valid
            try {
              const response = await fetch("/api/auth/verify", {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${storedAccessToken}`,
                },
              });

              if (response.ok) {
                setAccessToken(storedAccessToken);
              } else {
                // Access token expired, try to refresh
                await refreshAccessToken();
              }
            } catch {
              // Try to refresh
              await refreshAccessToken();
            }
          } else {
            // No access token, try to refresh
            await refreshAccessToken();
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshAccessToken]);

  const login = async (emailOrPhone: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ emailOrPhone, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    router.push("/dashboard");
  };

  const register = async (registerData: RegisterData) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registerData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      clearAuth();
      router.push("/");
    }
  };

  // Intercept fetch requests to add access token and handle 401
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const [url, options = {}] = args;
      const headers = new Headers(options.headers);

      // Add access token if available
      if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }

      let response = await originalFetch(url, { ...options, headers });

      // If 401, try to refresh token and retry
      if (response.status === 401 && accessToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          const newHeaders = new Headers(options.headers);
          newHeaders.set(
            "Authorization",
            `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`
          );
          response = await originalFetch(url, {
            ...options,
            headers: newHeaders,
          });
        }
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [accessToken, refreshAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        register,
        logout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
