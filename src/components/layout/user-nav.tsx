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

type UserMenuProps = {
  name?: string | null;
  email?: string | null;
  /** Shown as a small badge, e.g. "owner" or "Content Editor". */
  roleLabel?: string;
  fallbackName?: string;
  onSignOut: () => void;
};

/** The avatar button and account menu at the right of the top bar, for either portal. */
export function UserMenu({ name, email, roleLabel, fallbackName = "Admin", onSignOut }: UserMenuProps) {
  const initials = getInitials(name, email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-border bg-background p-1 pr-2.5 transition-colors hover:bg-muted focus:outline-hidden">
        <Avatar size="sm">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-xs font-medium text-foreground sm:inline-block">
          {name ?? email}
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
                {name ?? fallbackName}
              </span>
              {email ? <span className="max-w-full truncate text-xs text-muted-foreground">{email}</span> : null}
              {roleLabel ? (
                <Badge variant="secondary" className="mt-0.5 capitalize">
                  {roleLabel}
                </Badge>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <LogOut />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const signOutOfAdmin = () => signOut({ callbackUrl: "/admin/login" });

/** The Studio Admin account menu, read from the admin session. */
export function UserNav() {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user) return null;

  return <UserMenu name={user.name} email={user.email} roleLabel={user.role?.toLowerCase()} onSignOut={signOutOfAdmin} />;
}
