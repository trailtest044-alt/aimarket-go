/**
 * ============================================================
 *  BRAND SETTINGS — edit everything about your shop here.
 *  (নাম, ট্যাগলাইন, সাপোর্ট নাম্বার — সব এই এক ফাইলে বদলান)
 * ============================================================
 */

export const BRAND = {
  /** Shop name shown in the logo, titles and footer. */
  name: "AIMarket",
  /** First part of the name gets the gradient color (e.g. "AI" + "Market"). */
  nameAccent: "AI",
  nameRest: "Market",
  /** Short tagline under the logo / in the footer. */
  tagline: "Premium AI, delivered fast.",
  /** Meta description for Google / social share. */
  description:
    "Buy premium AI subscriptions — ChatGPT, Gemini, Midjourney, Ideogram, Recraft and more. Verified accounts, instant delivery, real support.",
};

/** WhatsApp support links — change the phone numbers here only. */
export const SUPPORT = {
  bdWorld: {
    label: "BD + Worldwide",
    sub: "WhatsApp Support",
    href: "https://api.whatsapp.com/send?phone=8801964719770",
  },
  pakistan: {
    label: "Pakistan",
    sub: "WhatsApp Support",
    href: "https://api.whatsapp.com/send?phone=923325666470",
  },
};
