const KNOWN_ACCOUNT_NAMES: Array<[RegExp, string]> = [
  [/\bideogram\b/i, "Ideogram"],
  [/\brecraft\b/i, "Recraft"],
  [/\bchatgpt\b/i, "ChatGPT"],
  [/\bgemini\b/i, "Gemini"],
  [/\bmidjourney\b/i, "Midjourney"],
];

export function manualActivationAccountName(productName = "") {
  const known = KNOWN_ACCOUNT_NAMES.find(([pattern]) => pattern.test(productName));
  if (known) return known[1];

  const cleaned = productName
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "Product";
}

export function manualActivationGuideImage(productName = "", configuredImageUrl = "") {
  if (configuredImageUrl.trim()) return configuredImageUrl.trim();
  if (/\bideogram\b/i.test(productName)) {
    return "/assets/guides/ideogram-login-password-guide.png";
  }
  return "";
}

export function manualActivationGuideTitle(productName = "") {
  return `How to set/reset your ${manualActivationAccountName(productName)} login password`;
}
