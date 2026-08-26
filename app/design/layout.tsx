import type { Metadata } from "next";
import { DesignNav } from "./DesignNav";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-muted-foreground">
      <DesignNav />
      <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
    </div>
  );
}
