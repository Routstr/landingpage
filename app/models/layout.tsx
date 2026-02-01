import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse AI Models",
  description:
    "Compare prices and features of top AI models including Llama 3, Mixtral, and more. Pay with Bitcoin Lightning.",
  openGraph: {
    title: "Browse AI Models | Routstr",
    description:
      "Compare prices and features of top AI models including Llama 3, Mixtral, and more. Pay with Bitcoin Lightning.",
    url: "https://routstr.com/models",
  },
  twitter: {
    title: "Browse AI Models | Routstr",
    description:
      "Compare prices and features of top AI models including Llama 3, Mixtral, and more.",
  },
};

export default function ModelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
