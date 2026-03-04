import ModelDetailPageClient from "./page-client";
import { fetchModels, models } from "@/app/data/models";

export async function generateStaticParams(): Promise<Array<{ modelId: string[] }>> {
  try {
    await fetchModels();
    const params = models
      .map((model) => model.id)
      .filter((id) => typeof id === "string" && id.length > 0)
      .map((id) => ({ modelId: id.split("/").filter(Boolean) }));
    return params.length > 0 ? params : [{ modelId: ["unavailable"] }];
  } catch {
    return [{ modelId: ["unavailable"] }];
  }
}

export default function ModelDetailPage() {
  return <ModelDetailPageClient />;
}
