import Link from "next/link";
import { BrainCircuit } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export function AppShell({
  children,
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-[#07152f] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link className="flex items-center gap-3" href="/" aria-label="Y3 MCQ Review home">
            <span className="grid size-10 place-items-center rounded-xl bg-[#2f6bff] shadow-[0_8px_24px_rgba(47,107,255,.35)]">
              <BrainCircuit className="size-5" aria-hidden="true" />
            </span>
            <span>
              <strong className="block text-[15px] leading-tight tracking-[-0.01em]">Y3 MCQ Review</strong>
              <span className="block text-[12px] text-blue-200/70">Revision workspace</span>
            </span>
          </Link>
          <Badge className="border border-white/10 bg-white/8 px-3 py-1 text-blue-100">Local progress</Badge>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
        {backHref && (
          <Link className="mb-6 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground" href={backHref}>
            ← {backLabel ?? "Back"}
          </Link>
        )}
        {(title || eyebrow || description) && (
          <div className="mb-8 max-w-3xl">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h1 className="mt-2 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{title}</h1>}
            {description && <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
