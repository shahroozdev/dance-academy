import { Logo } from "@/components/layout/logo";
import { Link } from "@/components/Link";
import { cn } from "@/lib/utils";

interface AppBrandProps {
  href?: string;
  className?: string;
  showName?: boolean;
  size?: number;
  onClick?: () => void;
}

export function AppBrand({ href = "/admin", className, showName = true, size = 30, onClick }: AppBrandProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("flex min-w-0 items-center gap-2.5 font-semibold text-sidebar-foreground", className)}
    >
      <Logo size={size} className="shrink-0" />
      {showName ? (
        <span className="truncate font-heading text-[15px] leading-tight tracking-tight group-data-[collapsible=icon]:hidden">
          Malhaar Dance Company
        </span>
      ) : null}
    </Link>
  );
}
