"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

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

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="pt-6 sm:pt-14 pb-10 sm:pb-14 bg-black">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Left column: title + subtitle (sticky) */}
            <div className="md:col-span-1">
              <div className="md:sticky md:top-24">
                <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
                  Blog
                </h1>
                <p className="text-base sm:text-xl text-gray-400">
                  Updates, guides, and announcements from the Routstr team
                </p>
              </div>
            </div>

            {/* Right column: independently scrollable list */}
            <div className="md:col-span-2">
              {posts === null && !errorMessage && (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, idx) => (
                      <div
                        key={idx}
                        className="bg-black border border-white/10 rounded-lg p-6 animate-pulse"
                      >
                        <div className="h-6 bg-white/5 rounded w-1/3 mb-3"></div>
                        <div className="h-4 bg-white/5 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-white/5 rounded w-2/3"></div>
                      </div>
                    ))}
                </div>
              )}

              {errorMessage && (
                <p className="text-sm text-gray-400">
                  {errorMessage} Add a file at{" "}
                  <code className="text-gray-300">public/blog/index.json</code>.
                </p>
              )}

              {Array.isArray(posts) && posts.length > 0 && (
                <ScrollArea className="h-[calc(100vh-220px)] pr-2">
                  <div className="flex flex-col space-y-4">
                    {posts.map((post) => (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        className="block bg-black border border-white/10 rounded-lg p-6 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0 flex flex-col gap-2">
                            <h2 className="text-base sm:text-xl font-bold text-white">
                              {post.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              {post.date && (
                                <span>
                                  {new Date(post.date).toLocaleDateString(
                                    undefined,
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </span>
                              )}
                              {post.tags && post.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {post.tags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="outline"
                                      className="text-gray-400 border-white/10"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            {post.description && (
                              <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">
                                {post.description}
                              </p>
                            )}
                          </div>
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-4 h-4 text-white"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 4.5l7.5 7.5-7.5 7.5"
                              />
                            </svg>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
