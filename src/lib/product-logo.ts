export const PRODUCT_LOGO_PRESETS = [
  { label: "Ideogram", match: "ideogram", src: "/product-logos/ideogram.webp?v=20260731" },
  { label: "Recraft", match: "recraft", src: "/product-logos/recraft.webp?v=20260731" },
  { label: "Netflix", match: "netflix", src: "/product-logos/netflix.svg?v=20260801" },
  { label: "CapCut", match: "capcut", src: "/product-logos/capcut.png?v=20260801" },
  { label: "ChatGPT", match: "chatgpt", src: "/product-logos/chatgpt.svg?v=20260801" },
  { label: "Gemini", match: "gemini", src: "/product-logos/gemini.svg?v=20260801" },
  { label: "Claude", match: "claude", src: "/product-logos/claude.svg?v=20260801" },
  { label: "ElevenLabs", match: "elevenlabs", src: "/product-logos/elevenlabs.svg?v=20260801" },
  { label: "Suno", match: "suno", src: "/product-logos/suno.svg?v=20260801" },
  { label: "Canva", match: "canva", src: "/product-logos/canva.svg?v=20260801" },
  { label: "PhotoRoom", match: "photoroom", src: "/product-logos/photoroom.png?v=20260801" },
  { label: "Leonardo", match: "leonardo", src: "/product-logos/leonardo.png?v=20260801" },
  { label: "Midjourney", match: "midjourney", src: "/product-logos/midjourney.png?v=20260801" },
  { label: "Runway", match: "runway", src: "/product-logos/runway.png?v=20260801" },
  { label: "Perplexity", match: "perplexity", src: "/product-logos/perplexity.svg?v=20260801" },
  { label: "Notion", match: "notion", src: "/product-logos/notion.svg?v=20260801" },
  { label: "Grammarly", match: "grammarly", src: "/product-logos/grammarly.svg?v=20260801" },
  { label: "Spotify", match: "spotify", src: "/product-logos/spotify.svg?v=20260801" },
  { label: "YouTube", match: "youtube", src: "/product-logos/youtube.svg?v=20260801" },
  { label: "Adobe", match: "adobe", src: "/product-logos/adobe.svg?v=20260801" },
] as const;

export function resolveProductLogoUrl(name?: string, logoUrl?: string) {
  const configuredLogoUrl = logoUrl?.trim();
  if (configuredLogoUrl) return configuredLogoUrl;
  const normalizedName = name?.trim().toLowerCase() || "";
  return PRODUCT_LOGO_PRESETS.find(({ match }) => normalizedName.includes(match))?.src;
}
