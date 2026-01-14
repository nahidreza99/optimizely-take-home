"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import sidebarData from "@/schema/sidebar.json";
import { useAuth } from "@/lib/contexts/AuthContext";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface SidebarItem {
  name: string;
  link: string;
  icon: string;
}

interface SuccessJob {
  id: string;
  job_id: string | null;
  content_type: string;
  prompt: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// Type guard to check if icon name exists in lucide-react
function isValidIcon(iconName: string): iconName is keyof typeof LucideIcons {
  return iconName in LucideIcons;
}

export function SidebarNav() {
  const pathname = usePathname();
  const items = sidebarData as SidebarItem[];
  const { isLoading: authLoading, accessToken } = useAuth();
  const [successJobs, setSuccessJobs] = React.useState<SuccessJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = React.useState(true);

  // Fetch success jobs after authentication is ready
  React.useEffect(() => {
    // Wait for auth to be ready
    if (authLoading) {
      return;
    }

    // Check if user is authenticated (either via state or localStorage)
    const ACCESS_TOKEN_KEY = "accessToken";
    const tokenFromStorage =
      typeof window !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

    // Don't fetch if there's no token available
    if (!accessToken && !tokenFromStorage) {
      setIsLoadingJobs(false);
      return;
    }

    const fetchSuccessJobs = async () => {
      try {
        setIsLoadingJobs(true);

        // Small delay to ensure interceptor is set up
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Let the interceptor handle adding the Authorization header
        // It will read from localStorage automatically
        const response = await fetch("/api/ai/generate?limit=20&offset=0");

        if (!response.ok) {
          // If still 401 after interceptor tried to refresh, user might not be authenticated
          if (response.status === 401) {
            console.warn("Unauthorized - user may not be authenticated");
            setSuccessJobs([]);
            return;
          }
          throw new Error(`Failed to fetch success jobs: ${response.status}`);
        }

        const data = await response.json();
        setSuccessJobs(data.data || []);
      } catch (error) {
        console.error("Error fetching success jobs:", error);
        setSuccessJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };

    fetchSuccessJobs();
  }, [authLoading, accessToken]);

  return (
    <SidebarContent>
      {/* Navigation Group */}
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const IconComponent = isValidIcon(item.icon)
                ? (LucideIcons[item.icon] as React.ComponentType<{
                    className?: string;
                  }>)
                : null;

              const isActive = pathname === item.link;

              return (
                <SidebarMenuItem key={item.link}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                    className="[&>svg]:!size-[18px]"
                  >
                    <Link href={item.link}>
                      {IconComponent && (
                        <IconComponent className="h-[18px] w-[18px] shrink-0" />
                      )}
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Success Jobs Group */}
      {!isLoadingJobs && successJobs.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>Success Jobs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {successJobs.map((job) => {
                const displayText = job.title || job.job_id || job.id;
                // Truncate long text for display
                const truncatedText =
                  displayText.length > 20
                    ? `${displayText.slice(0, 20)}...`
                    : displayText;
                const isActive = pathname === `/jobs/${job.id}`;

                return (
                  <SidebarMenuItem key={job.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={displayText}
                      className="[&>svg]:!size-[18px]"
                    >
                      <Link href={`/jobs/${job.id}`}>
                        <LucideIcons.CheckCircle className="h-[18px] w-[18px] shrink-0" />
                        <span>{truncatedText}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}
    </SidebarContent>
  );
}
