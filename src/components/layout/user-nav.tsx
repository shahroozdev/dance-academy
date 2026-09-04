"use client";

import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }
  return email?.slice(0, 2).toUpperCase() ?? "AD";
}

export function UserNav() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  const initials = getInitials(user.name, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border bg-background p-1 pr-2.5 transition-colors hover:bg-muted focus:outline-hidden">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-xs font-medium text-foreground sm:inline-block">
          {user.name ?? user.email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="py-3 font-normal">
          <div className="flex flex-col items-center gap-2 text-center">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col items-center gap-1">
              <span className="max-w-full truncate text-sm font-semibold text-foreground">
                {user.name ?? "Admin"}
              </span>
              <span className="max-w-full truncate text-xs text-muted-foreground">{user.email}</span>
              {user.role ? (
                <Badge variant="secondary" className="mt-0.5 capitalize">
                  {user.role.toLowerCase()}
                </Badge>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
