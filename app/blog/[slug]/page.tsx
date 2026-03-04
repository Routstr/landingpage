import fs from "node:fs/promises";
import path from "node:path";
import BlogPostPageClient from "./page-client";

type BlogIndexItem = {
  slug?: string;
};

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const indexPath = path.join(process.cwd(), "public", "blog", "index.json");
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (item as BlogIndexItem)?.slug)
      .filter((slug): slug is string => typeof slug === "string" && slug.length > 0)
      .map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export default function BlogPostPage() {
  return <BlogPostPageClient />;
}
