import ProviderPageClient from "./page-client";
import { fetchModels, providers } from "@/app/data/models";

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  try {
    await fetchModels();
    const params = providers
      .map((provider) => provider.id)
      .filter((id) => typeof id === "string" && id.length > 0)
      .map((id) => ({ id }));
    return params.length > 0 ? params : [{ id: "unavailable" }];
  } catch {
    return [{ id: "unavailable" }];
  }
}

export default function ProviderPage() {
  return <ProviderPageClient />;
}
