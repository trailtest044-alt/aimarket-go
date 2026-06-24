import { useState } from "react";

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
  const showImage = !!logoUrl && !failed;
  return (
    <div className={`grid place-items-center overflow-hidden ${className}`}>
      {showImage ? (
        <img
          src={logoUrl}
          alt={name ? `${name} logo` : "Product logo"}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
          loading="lazy"
        />
      ) : (
        <span className={emojiClassName || "text-3xl"}>{icon}</span>
      )}
    </div>
  );
}
