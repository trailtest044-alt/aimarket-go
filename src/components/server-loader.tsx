import { BrandMark } from "@/components/brand-logo";

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
    <div className={`glass relative overflow-hidden rounded-3xl ${compact ? "p-6" : "p-10 sm:p-12"}`}>
      <div className="relative flex flex-col items-center justify-center text-center">
        <div className="orb-loader" aria-hidden="true">
          <span className="orb-ring orb-ring--b"><i /></span>
          <span className="orb-ring orb-ring--a"><i /></span>
          <span className="orb-core">
            <BrandMark className="h-8 w-8" />
          </span>
        </div>
        <h3 className="mt-6 font-display text-base font-bold text-foreground sm:text-lg">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
        <div className="loader-bar mt-6" aria-hidden="true" />
      </div>
    </div>
  );
}
