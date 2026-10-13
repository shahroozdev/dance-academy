import Image from "next/image";

import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  src?: string | null;
}

export function Logo({ size = 28, className, src }: LogoProps) {
  return (
    <Image
      src={src || "/images/client/logo-no-bg.png"}
      alt="Malhaar Dance Company"
      width={size}
      height={size}
      priority
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
