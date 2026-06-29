import { Sparkles, PackageSearch, Bot } from "lucide-react";

type ServerLoaderProps = {
  title?: string;
  message?: string;
  compact?: boolean;
  cards?: number;
};

export function ServerLoader({
  title = "Please wait, server loading...",
  message = "Preparing the latest products and order information for you.",
  compact = false,
  cards = 3,
}: ServerLoaderProps) {
  return (
    <div className={`glass relative overflow-hidden rounded-3xl ${compact ? "p-5" : "p-8"}`}>
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-accent/25 blur-3xl" />
      <div className="relative flex flex-col items-center text-center">
        <div className="relative mb-4">
          <div className="h-20 w-20 animate-pulse rounded-[2rem] bg-gradient-primary shadow-glow" />
          <div className="absolute inset-0 grid place-items-center">
            <Bot className="h-9 w-9 animate-bounce text-primary-foreground" />
          </div>
          <Sparkles className="absolute -right-2 -top-2 h-5 w-5 animate-pulse text-primary" />
          <PackageSearch className="absolute -bottom-1 -left-2 h-5 w-5 animate-pulse text-accent" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
        <div className="mt-4 flex gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:-0.1s]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
      {!compact && (
        <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-white/60 bg-white/55 p-4 shadow-soft">
              <div className="h-12 w-12 animate-pulse rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30" />
              <div className="mt-4 h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-2 h-3 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="mt-5 h-9 animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
