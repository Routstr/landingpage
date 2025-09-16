"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = useMemo(() => (params?.slug as string) || "", [params]);

  const [markdown, setMarkdown] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let isCancelled = false;

    fetch(`/blog/${encodeURIComponent(slug)}.md`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.text();
      })
      .then((text: string) => {
        if (!isCancelled) setMarkdown(text);
      })
      .catch(() => {
        if (!isCancelled) setErrorMessage("Post not found.");
      });

    return () => {
      isCancelled = true;
    };
  }, [slug]);

  return (
    <main className="flex min-h-screen flex-col bg-black text-white">
      <Header />

      <section className="py-10 sm:py-12 bg-black">
        <div className="w-full max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => router.back()}
              className="mb-6 text-sm text-gray-400 hover:text-white transition-colors"
              aria-label="Go back"
            >
              ← Back
            </button>
          </div>

          {markdown === null && !errorMessage && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Title skeleton */}
              <div className="h-9 w-3/4 bg-white/10 animate-pulse rounded" />
              <div className="h-9 w-1/2 bg-white/10 animate-pulse rounded" />

              {/* Body skeleton */}
              <div className="space-y-2 pt-2">
                <div className="h-4 w-full bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-11/12 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-10/12 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-9/12 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-10/12 bg-white/5 animate-pulse rounded" />
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-gray-400">{errorMessage}</p>
          )}

          {markdown && (
            <article className="prose-custom mx-auto">
              <ReactMarkdown
                components={{
                  a({ href, children, ...props }) {
                    return (
                      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    );
                  },
                  img({ src, alt, ...props }) {
                    // eslint-disable-next-line @next/next/no-img-element
                    return (
                      <img src={src || ""} alt={alt || ""} className="rounded-lg border border-white/10" {...props} />
                    );
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeText = String(children);
                    const isInline = typeof inline === "boolean" ? inline : !/[\r\n]/.test(codeText);
                    if (!isInline && match) {
                      return (
                        <SyntaxHighlighter
                          style={atomDark as any}
                          language={match ? match[1] : undefined}
                          PreTag="pre"
                          customStyle={{ background: "transparent", margin: 0, padding: 0 }}
                          {...props}
                        >
                          {codeText.replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {markdown}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}


