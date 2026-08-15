/**
 * ============================================================
 *  SITE CONFIG — চেকআউট, ওয়ালেট ব্র্যান্ডিং, প্রোমো, হিরো —
 *  সব টেক্সট / কালার / স্টেপ এই এক ফাইল থেকে এডিট করুন।
 *
 *  ▸ ওয়ালেটের কালার বদলাতে চাইলে: color / color2 বদলান
 *  ▸ পেমেন্ট স্টেপ বদলাতে চাইলে: steps অ্যারে এডিট করুন
 *  ▸ প্রোমো বক্সের লেখা বদলাতে চাইলে: PROMO_TEXT এডিট করুন
 *  ▸ নতুন চ্যানেল যোগ করতে চাইলে: WALLETS-এ নতুন entry দিন
 * ============================================================
 */

export type WalletKey =
  | "bKash"
  | "Nagad"
  | "Easypaisa"
  | "JazzCash"
  | "Bank Transfer"
  | "Binance Pay"
  | "USDT TRC20"
  | "USDT BEP20";

export type WalletTheme = {
  /** Big label shown on the panel */
  label: string;
  /** Short monogram inside the colored chip (e.g. "bK") */
  monogram: string;
  /** Main brand color (hex) — panel glow, buttons, step dots */
  color: string;
  /** Secondary brand color for the gradient */
  color2: string;
  /** Text color used on top of the brand gradient */
  ink: string;
  /** Badge text on the panel top-right */
  badge: string;
  /** Which field of PaymentSettings holds the account number */
  numberLabel: string;
  /** Step-by-step payment instructions (English) */
  steps: string[];
  /** Step-by-step payment instructions (বাংলা) — খালি রাখলে দেখাবে না */
  stepsBn: string[];
  /** What the customer must paste after paying */
  proofLabel: string;
  proofHint: string;
};

/** ------------------------------------------------------------------
 *  WALLET BRANDING + INSTRUCTIONS
 *  bKash সিলেক্ট করলে পুরো পেমেন্ট প্যানেল গোলাপি bKash থিম হয়ে যায়,
 *  Nagad সিলেক্ট করলে কমলা Nagad থিম — সব নিচের কালার থেকে আসে।
 *  ------------------------------------------------------------------ */
export const WALLETS: Record<WalletKey, WalletTheme> = {
  bKash: {
    label: "bKash",
    monogram: "bK",
    color: "#E2136E", // bKash pink
    color2: "#FF5FA2",
    ink: "#ffffff",
    badge: "Send Money",
    numberLabel: "bKash Personal Number",
    steps: [
      "Open the bKash app and tap “Send Money”.",
      "Enter the bKash number shown below (tap to copy).",
      "Enter the exact amount shown in your order ticket.",
      "Confirm with your PIN and copy the Transaction ID (TrxID).",
      "Paste the TrxID in the box below and submit your order.",
    ],
    stepsBn: [
      "bKash অ্যাপ খুলে “Send Money”-তে ট্যাপ করুন।",
      "নিচের bKash নাম্বারটি দিন (কপি করতে ট্যাপ করুন)।",
      "অর্ডার টিকেটে দেখানো সঠিক Amount দিন।",
      "PIN দিয়ে কনফার্ম করে Transaction ID (TrxID) কপি করুন।",
      "নিচের বক্সে TrxID পেস্ট করে অর্ডার সাবমিট করুন।",
    ],
    proofLabel: "bKash Transaction ID (TrxID)",
    proofHint: "e.g. 9HK7A2B1XC — bKash SMS / app history-তে পাবেন",
  },
  Nagad: {
    label: "Nagad",
    monogram: "N",
    color: "#F6921E", // Nagad orange
    color2: "#EC1D24", // Nagad red
    ink: "#ffffff",
    badge: "Send Money",
    numberLabel: "Nagad Personal Number",
    steps: [
      "Open the Nagad app and tap “Send Money”.",
      "Enter the Nagad number shown below (tap to copy).",
      "Enter the exact amount shown in your order ticket.",
      "Confirm with your PIN and copy the Transaction ID.",
      "Paste the Transaction ID below and submit your order.",
    ],
    stepsBn: [
      "Nagad অ্যাপ খুলে “Send Money”-তে ট্যাপ করুন।",
      "নিচের Nagad নাম্বারটি দিন (কপি করতে ট্যাপ করুন)।",
      "অর্ডার টিকেটে দেখানো সঠিক Amount দিন।",
      "PIN দিয়ে কনফার্ম করে Transaction ID কপি করুন।",
      "নিচের বক্সে Transaction ID পেস্ট করে অর্ডার সাবমিট করুন।",
    ],
    proofLabel: "Nagad Transaction ID",
    proofHint: "Nagad SMS / লেনদেন হিস্টোরিতে পাবেন",
  },
  Easypaisa: {
    label: "Easypaisa",
    monogram: "EP",
    color: "#33A867",
    color2: "#8CC63F",
    ink: "#ffffff",
    badge: "Money Transfer",
    numberLabel: "Easypaisa Account",
    steps: [
      "Open Easypaisa and choose “Money Transfer → Easypaisa Account”.",
      "Enter the account number shown below (tap to copy).",
      "Send the exact amount shown in your order ticket.",
      "Copy the Transaction ID (TID) from the confirmation.",
      "Paste the TID below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "Easypaisa Transaction ID (TID)",
    proofHint: "From the Easypaisa confirmation screen / SMS",
  },
  JazzCash: {
    label: "JazzCash",
    monogram: "JC",
    color: "#C8102E",
    color2: "#F9A11B",
    ink: "#ffffff",
    badge: "Money Transfer",
    numberLabel: "JazzCash Account",
    steps: [
      "Open JazzCash and choose “Money Transfer → JazzCash Account”.",
      "Enter the account number shown below (tap to copy).",
      "Send the exact amount shown in your order ticket.",
      "Copy the Transaction ID (TID) from the confirmation.",
      "Paste the TID below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "JazzCash Transaction ID (TID)",
    proofHint: "From the JazzCash confirmation screen / SMS",
  },
  "Bank Transfer": {
    label: "Bank Transfer",
    monogram: "BT",
    color: "#3B82F6",
    color2: "#8B5CF6",
    ink: "#ffffff",
    badge: "IBFT",
    numberLabel: "Bank Account / IBAN",
    steps: [
      "Open your bank app and start an IBFT / bank transfer.",
      "Enter the account details shown below (tap to copy).",
      "Send the exact amount shown in your order ticket.",
      "Copy the transfer reference number from the receipt.",
      "Paste the reference below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "Bank Transfer Reference",
    proofHint: "The reference / receipt number from your bank",
  },
  "Binance Pay": {
    label: "Binance Pay",
    monogram: "◆",
    color: "#F0B90B",
    color2: "#FCD535",
    ink: "#181A20",
    badge: "Zero Fee",
    numberLabel: "Binance Pay ID",
    steps: [
      "Open Binance → Pay → “Send”.",
      "Choose “Pay ID” and enter the ID shown below (tap to copy).",
      "Send the exact USDT amount shown in your order ticket.",
      "Copy the Order/Transaction ID from Binance Pay history.",
      "Paste it below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "Binance Pay Order ID",
    proofHint: "From Binance → Pay → Transaction history",
  },
  "USDT TRC20": {
    label: "USDT · TRC20",
    monogram: "T",
    color: "#26A17B",
    color2: "#50E3C2",
    ink: "#ffffff",
    badge: "TRON Network",
    numberLabel: "USDT Wallet (TRC20)",
    steps: [
      "Open your wallet and choose Send USDT on the TRON (TRC20) network.",
      "Paste the wallet address shown below (tap to copy).",
      "Send the exact USDT amount — double-check the network is TRC20.",
      "Copy the Transaction Hash (TxID) after it confirms.",
      "Paste the TxID below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "Transaction Hash (TxID)",
    proofHint: "The TRC20 transaction hash from your wallet",
  },
  "USDT BEP20": {
    label: "USDT · BEP20",
    monogram: "B",
    color: "#F0B90B",
    color2: "#F8D12F",
    ink: "#181A20",
    badge: "BNB Chain",
    numberLabel: "USDT Wallet (BEP20)",
    steps: [
      "Open your wallet and choose Send USDT on BNB Smart Chain (BEP20).",
      "Paste the wallet address shown below (tap to copy).",
      "Send the exact USDT amount — double-check the network is BEP20.",
      "Copy the Transaction Hash (TxID) after it confirms.",
      "Paste the TxID below and submit your order.",
    ],
    stepsBn: [],
    proofLabel: "Transaction Hash (TxID)",
    proofHint: "The BEP20 transaction hash from your wallet",
  },
};

/** কোন গেটওয়েতে কোন কোন চ্যানেল দেখাবে */
export const METHOD_CHANNELS: Record<"bangladesh" | "pakistan" | "binance", WalletKey[]> = {
  bangladesh: ["bKash", "Nagad"],
  pakistan: ["Easypaisa", "JazzCash", "Bank Transfer"],
  binance: ["Binance Pay", "USDT TRC20", "USDT BEP20"],
};

/** গেটওয়ে ট্যাবের লেখা */
export const METHOD_META = {
  bangladesh: { flag: "🇧🇩", title: "Bangladesh", sub: "bKash · Nagad" },
  pakistan: { flag: "🇵🇰", title: "Pakistan", sub: "Easypaisa · JazzCash · Bank" },
  binance: { flag: "🟡", title: "Binance / Crypto", sub: "Pay ID · USDT" },
} as const;

/** ------------------------------------------------------------------
 *  PROMO CODE — চেকআউটের প্রোমো বক্সের সব লেখা
 *  ------------------------------------------------------------------ */
export const PROMO_TEXT = {
  title: "Have a promo code?",
  titleBn: "প্রোমো কোড আছে?",
  placeholder: "e.g. WELCOME10",
  applyButton: "Apply",
  applying: "Checking…",
  removeButton: "Remove",
  appliedPrefix: "Applied", // e.g. Applied · WELCOME10
  invalidFallback: "This promo code is not valid.",
  savingsLabel: "You save",
};

/** ------------------------------------------------------------------
 *  CHECKOUT PAGE TEXTS
 *  ------------------------------------------------------------------ */
export const CHECKOUT_TEXT = {
  title: "Secure Checkout",
  subtitle:
    "Pay with your wallet first, then paste the transaction ID here — your account is delivered right after admin approval.",
  subtitleBn: "আগে ওয়ালেট দিয়ে পেমেন্ট করুন, তারপর Transaction ID এখানে দিন — এডমিন এপ্রুভ করলেই ডেলিভারি।",
  steps: ["Your info", "Pay & verify", "Delivered"],
  infoTitle: "Your information",
  infoHint: "ডেলিভারি এই ইমেইলে ট্র্যাক হবে — সঠিক ইমেইল দিন।",
  payTitle: "Choose how you pay",
  payHint: "যেকোনো একটি চ্যানেল সিলেক্ট করুন — পুরো গাইড নিচে চলে আসবে।",
  summaryTitle: "Order ticket",
  guaranteeNote: "Account / instructions unlock on your order page after admin approval.",
  submitIdle: "Submit order",
  submitBusy: "Submitting order…",
  trackNote: "Save your Transaction ID — you can check status anytime in “Track Your Orders”.",
};
