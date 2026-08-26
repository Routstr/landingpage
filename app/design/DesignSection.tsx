import type { ReactNode } from "react";

export function DesignSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-14 md:px-12 md:py-20">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
        {eyebrow}
      </p>
      <h1 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
      {description ? (
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : (
        <div className="mb-10" />
      )}
      <div className="flex flex-col gap-14">{children}</div>
    </div>
  );
}

export function DesignBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.1em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
