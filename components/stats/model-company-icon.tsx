import { Box } from "lucide-react";
import * as CompanyIcons from "@/components/icons/companyIcons";

const COMPANY_ICONS = [
  { icon: CompanyIcons.ClaudeIcon, keywords: ["anthropic", "claude"] },
  {
    icon: CompanyIcons.OpenAIIcon,
    keywords: ["openai", "gpt", "chatgpt", "text-embedding"],
  },
  { icon: CompanyIcons.DeepSeekIcon, keywords: ["deepseek"] },
  { icon: CompanyIcons.ZAIIcon, keywords: ["zhipu", "glm", "z-ai", "z ai"] },
  { icon: CompanyIcons.KimiIcon, keywords: ["moonshot", "kimi"] },
  { icon: CompanyIcons.MinimaxIcon, keywords: ["minimax"] },
  { icon: CompanyIcons.GeminiIcon, keywords: ["google", "gemini", "gemma"] },
  { icon: CompanyIcons.QwenIcon, keywords: ["alibaba", "qwen", "qwq", "wan"] },
  { icon: CompanyIcons.GrokIcon, keywords: ["xai", "x-ai", "x ai", "grok"] },
  { icon: CompanyIcons.PerplexityIcon, keywords: ["perplexity", "sonar", "pplx"] },
  { icon: CompanyIcons.MistralIcon, keywords: ["mistral", "mixtral", "codestral", "ministral"] },
  { icon: CompanyIcons.MetaIcon, keywords: ["meta", "llama"] },
  { icon: CompanyIcons.CohereIcon, keywords: ["cohere", "command"] },
  { icon: CompanyIcons.NvidiaIcon, keywords: ["nvidia", "nemotron"] },
  { icon: CompanyIcons.AwsIcon, keywords: ["amazon", "nova"] },
  { icon: CompanyIcons.XiaomiMiMoIcon, keywords: ["xiaomi", "mimo"] },
  { icon: CompanyIcons.StepfunIcon, keywords: ["stepfun"] },
  { icon: CompanyIcons.VeniceIcon, keywords: ["venice"] },
] as const;

const GENERIC_PROVIDER_IDS = new Set(["model", "models", "unknown"]);

function resolveIcon(haystack: string) {
  return COMPANY_ICONS.find(({ keywords }) =>
    keywords.some((keyword) => haystack.includes(keyword))
  )?.icon;
}

export function ModelCompanyIcon({
  model,
  provider,
  className,
}: {
  model: string;
  provider?: string;
  className?: string;
}) {
  const modelProvider = model.includes("/") ? model.split("/", 1)[0] : "";
  const providerId = (provider || modelProvider).trim().toLowerCase();
  const hasSpecificProvider =
    providerId.length > 0 && !GENERIC_PROVIDER_IDS.has(providerId);
  const Icon = hasSpecificProvider
    ? resolveIcon(providerId)
    : resolveIcon(model.toLowerCase());

  if (!Icon) {
    return <Box aria-hidden="true" className={className} />;
  }

  return <Icon aria-hidden="true" className={className} size="1em" />;
}
