import { Bot, Loader2, Sparkles } from "lucide-react";

export function ServerLoader({
  compact = false,
  title = "Please wait, server loading...",
  message = "Preparing a secure connection and loading the latest data.",
}: {
  compact?: boolean;
  title?: string;
  message?: string;
}) {
  return (
    <div className={`glass grid place-items-center rounded-3xl text-center ${compact ? "min-h-48 p-8" : "min-h-[360px] p-10"}`}>
      <div className="relative mx-auto h-24 w-24">
        <div className="absolute inset-0 rounded-full bg-gradient-primary opacity-20 blur-2xl animate-pulse" />
        <div className="absolute inset-2 rounded-full border border-primary/20 bg-white/80 shadow-glow" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary border-r-accent animate-spin" />
        <div className="absolute inset-0 grid place-items-center">
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow animate-float-soft">
            <Bot className="h-7 w-7" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 animate-pulse" />
          </div>
        </div>
      </div>
      <h3 className="mt-6 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-semibold text-muted-foreground ring-1 ring-border">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Loading latest data
      </div>
    </div>
  );
}
