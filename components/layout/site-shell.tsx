import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

interface SiteShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  useMain?: boolean;
}

export function SiteShell({
  children,
  className,
  contentClassName,
  useMain = true,
}: SiteShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-background text-muted-foreground selection:bg-neutral-800 selection:text-foreground",
        className
      )}
    >
      <Header />
      {useMain ? <main className={cn("flex-grow", contentClassName)}>{children}</main> : children}
      <div className="mx-auto w-full max-w-[1800px]">
        <Footer />
      </div>
    </div>
  );
}

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full max-w-[1800px] px-[clamp(1rem,5vw,5rem)]", className)}>
      {children}
    </div>
  );
}
