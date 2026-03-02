"use client";

import Link from "next/link";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type BlogPostMeta = {
  slug: string;
  title: string;
  description?: string;
  date?: string;
  tags?: string[];
};

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPostMeta[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    fetch("/blog/index.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((data: BlogPostMeta[]) => {
        if (!isCancelled) setPosts(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!isCancelled) setErrorMessage("No blog index found.");
      });
    return () => { isCancelled = true; };
  }, []);

  return (
    <SiteShell>
      <section className="py-12 md:py-20">
        <PageContainer>
          <div className="text-left mb-16">
            <h1 className="text-2xl md:text-3xl font-medium text-foreground mb-4 tracking-tight">Blog</h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl font-light leading-relaxed">
              Updates, guides, and announcements from the Routstr team.
            </p>
          </div>

          <div className="flex flex-col">
            {posts === null && !errorMessage && (
              <div className="space-y-8">
                {Array(3).fill(0).map((_, idx) => (
                  <div key={idx} className="border-b border-border/30 pb-12 animate-pulse">
                    <div className="h-6 bg-border rounded w-1/3 mb-4" />
                    <div className="h-4 bg-border rounded w-1/4 mb-6" />
                    <div className="h-4 bg-border rounded w-full" />
                  </div>
                ))}
              </div>
            )}

            {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}

            {Array.isArray(posts) && posts.length > 0 && (
              <div className="flex flex-col">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group border-b border-border/30 py-12 hover:bg-card/30 transition-colors px-4 -mx-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 mb-4">
                      <h2 className="text-lg md:text-xl font-medium text-white group-hover:underline decoration-muted-foreground underline-offset-4">
                        {post.title}
                      </h2>
                      {post.date && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(post.date).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    
                    {post.description && (
                      <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-3xl">
                        {post.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      Read article <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </PageContainer>
      </section>
    </SiteShell>
  );
}
