"use client";

import { useEffect, useMemo, useState, type HTMLAttributes, type ReactNode } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import BackButton from "@/components/BackButton";
import { PageContainer, SiteShell } from "@/components/layout/site-shell";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
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

    return () => { isCancelled = true; };
  }, [slug]);

  return (
    <SiteShell>
      <section className="py-12 md:py-20">
        <PageContainer>
          <div className="mx-auto w-full max-w-3xl">
            <BackButton
              fallbackHref="/blog"
              className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-12"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Blog
            </BackButton>

            {markdown === null && !errorMessage && (
              <div className="space-y-8 animate-pulse">
                <div className="h-10 bg-border rounded w-3/4" />
                <div className="space-y-4">
                  <div className="h-4 bg-border rounded w-full" />
                  <div className="h-4 bg-border rounded w-11/12" />
                  <div className="h-4 bg-border rounded w-10/12" />
                </div>
              </div>
            )}

            {errorMessage && <p className="text-sm text-muted-foreground">{errorMessage}</p>}

            {markdown && (
              <article className="prose prose-sm md:prose-base prose-invert max-w-none prose-headings:font-medium prose-strong:font-medium prose-pre:bg-card prose-pre:border prose-pre:border-border prose-img:rounded-lg prose-img:border prose-img:border-border text-muted-foreground">
                <ReactMarkdown
                  components={{
                    a({ href, children, ...props }) {
                      const isExternal =
                        typeof href === "string" &&
                        /^(https?:)?\/\//i.test(href);

                      return (
                        <a
                          href={href}
                          target={isExternal ? "_blank" : undefined}
                          rel={isExternal ? "noopener noreferrer" : undefined}
                          className="inline-flex items-center gap-1 text-foreground underline decoration-muted-foreground underline-offset-4"
                          {...props}
                        >
                          <span>{children}</span>
                          {isExternal ? (
                            <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                          ) : null}
                        </a>
                      );
                    },
                    img({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
                      return (
                        <Image
                          src={typeof src === "string" ? src : ""}
                          alt={typeof alt === "string" ? alt : ""}
                          width={typeof props.width === "number" ? props.width : 800}
                          height={typeof props.height === "number" ? props.height : 600}
                          className="rounded-lg border border-border"
                        />
                      );
                    },
                    code({
                      inline,
                      className,
                      children,
                      ...props
                    }: HTMLAttributes<HTMLElement> & {
                      inline?: boolean;
                      className?: string;
                      children?: ReactNode;
                    }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeText = String(children);
                      if (!inline && match) {
                        return (
                          <SyntaxHighlighter
                            language={match[1]}
                            style={vscDarkPlus}
                            PreTag="div"
                            customStyle={{ background: "transparent", margin: 0, padding: "1.5rem" }}
                          >
                            {codeText.replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      }
                      return <code className="bg-muted px-1.5 py-0.5 rounded text-foreground" {...props}>{children}</code>;
                    },
                  }}
                >
                  {markdown}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </PageContainer>
      </section>
    </SiteShell>
  );
}
