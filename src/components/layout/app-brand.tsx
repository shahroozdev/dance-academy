import { Logo } from "@/components/layout/logo";
import { Link } from "@/components/Link";
import { cn } from "@/lib/utils";

interface AppBrandProps {
  href?: string;
  className?: string;
  showName?: boolean;
  name?: string;
  size?: number;
  onClick?: () => void;
  logoSrc?: string | null;
}

export function AppBrand({
  href = "/admin",
  className,
  showName = true,
  name = "Malhaar Dance Company",
  size = 30,
  onClick,
  logoSrc,
}: AppBrandProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn("flex min-w-0 items-center gap-2.5 font-semibold text-sidebar-foreground", className)}
    >
      <Logo size={size} className="shrink-0" src={logoSrc} />
      {showName ? (
        <span className="truncate font-heading text-[15px] leading-tight tracking-tight group-data-[collapsible=icon]:hidden">
          {name}
        </span>
      ) : null}
    </Link>
  );
}
