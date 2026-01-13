"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import sidebarData from "@/schema/sidebar.json";
import {
  SidebarContent,
  SidebarGroup,
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

// Type guard to check if icon name exists in lucide-react
function isValidIcon(iconName: string): iconName is keyof typeof LucideIcons {
  return iconName in LucideIcons;
}

export function SidebarNav() {
  const pathname = usePathname();
  const items = sidebarData as SidebarItem[];

  return (
    <SidebarContent>
      <SidebarGroup>
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
    </SidebarContent>
  );
}
