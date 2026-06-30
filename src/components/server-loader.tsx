import { Sparkles } from "lucide-react";

export function ServerLoader({
  title = "Please wait, server loading...",
  message = "Preparing everything for you.",
  compact = false,
}: {
  title?: string;
  message?: string;
  compact?: boolean;
}) {
  return (
    <div className={`glass relative overflow-hidden rounded-3xl ${compact ? "p-6" : "p-8 sm:p-10"}`}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(124,103,255,.22),transparent_30%),radial-gradient(circle_at_80%_30%,rgba(0,184,216,.20),transparent_35%)]" />
      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="server-mascot" aria-hidden="true">
          <div className="server-mascot__head">
            <span className="server-mascot__eye" />
            <span className="server-mascot__eye" />
            <span className="server-mascot__spark"><Sparkles className="h-3.5 w-3.5" /></span>
          </div>
          <div className="server-mascot__body">
            <span />
            <span />
            <span />
          </div>
        </div>
        <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
        <div className="mt-5 flex items-center gap-2">
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:120ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:240ms]" />
        </div>
      </div>
    </div>
  );
}
