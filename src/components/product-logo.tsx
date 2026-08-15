import { useState } from "react";
import { resolveProductLogoUrl } from "@/lib/product-logo";

export function ProductLogo({
  logoUrl,
  icon,
  name,
  className = "",
  emojiClassName = "",
}: {
  logoUrl?: string;
  icon: string;
  name?: string;
  className?: string;
  emojiClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const resolvedLogoUrl = resolveProductLogoUrl(name, logoUrl);
  const isLocalPriorityLogo = resolvedLogoUrl?.startsWith("/product-logos/") ?? false;
  const showImage = !!resolvedLogoUrl && !failed;
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={resolvedLogoUrl}
          alt={name ? `${name} logo` : "Product logo"}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
          loading={isLocalPriorityLogo ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={isLocalPriorityLogo ? "high" : "auto"}
        />
      ) : (
        <span className={emojiClassName || "text-3xl"}>{icon}</span>
      )}
    </div>
  );
}
