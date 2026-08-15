/** Shared checkout labels, payment branding, and customer-facing copy. */

export type WalletKey = "bKash" | "Nagad" | "Binance Pay" | "USDT TRC20" | "USDT BEP20";

export type WalletTheme = {
  label: string;
  monogram: string;
  color: string;
  color2: string;
  ink: string;
  badge: string;
  numberLabel: string;
  steps: string[];
  proofLabel: string;
  proofHint: string;
};

export const WALLETS: Record<WalletKey, WalletTheme> = {
  bKash: {
    label: "bKash", monogram: "bK", color: "#E2136E", color2: "#FF5FA2", ink: "#ffffff", badge: "Send Money",
    numberLabel: "bKash Personal Number",
    steps: ["Open bKash and choose Send Money.", "Enter the bKash number shown below.", "Send the exact amount in your order ticket.", "Save your bKash number or Transaction ID as payment proof."],
    proofLabel: "bKash number or Transaction ID",
    proofHint: "Enter the bKash number or Transaction ID used for this payment",
  },
  Nagad: {
    label: "Nagad", monogram: "N", color: "#F6921E", color2: "#EC1D24", ink: "#ffffff", badge: "Send Money",
    numberLabel: "Nagad Personal Number",
    steps: ["Open Nagad and choose Send Money.", "Enter the Nagad number shown below.", "Send the exact amount in your order ticket.", "Save your Nagad number or Transaction ID as payment proof."],
    proofLabel: "Nagad number or Transaction ID",
    proofHint: "Enter the Nagad number or Transaction ID used for this payment",
  },
  "Binance Pay": {
    label: "Binance Pay", monogram: "◆", color: "#F0B90B", color2: "#FCD535", ink: "#181A20", badge: "USDT",
    numberLabel: "Binance Pay ID",
    steps: ["Open Binance Pay and choose Send.", "Enter the Pay ID shown below.", "Send the exact USDT amount in your order ticket.", "Copy the Binance Order ID or Transaction ID from payment history."],
    proofLabel: "Binance Order ID or Transaction ID",
    proofHint: "Enter your Binance Order ID or Transaction ID",
  },
  "USDT TRC20": {
    label: "USDT · TRC20", monogram: "T", color: "#26A17B", color2: "#50E3C2", ink: "#ffffff", badge: "TRON Network",
    numberLabel: "USDT Wallet (TRC20)",
    steps: ["Choose USDT on the TRC20 network.", "Copy the wallet address shown below.", "Send the exact USDT amount in your order ticket.", "Copy the transaction hash after payment confirms."],
    proofLabel: "USDT Transaction ID",
    proofHint: "Enter the transaction hash or transaction ID",
  },
  "USDT BEP20": {
    label: "USDT · BEP20", monogram: "B", color: "#F0B90B", color2: "#F8D12F", ink: "#181A20", badge: "BNB Chain",
    numberLabel: "USDT Wallet (BEP20)",
    steps: ["Choose USDT on the BEP20 network.", "Copy the wallet address shown below.", "Send the exact USDT amount in your order ticket.", "Copy the transaction hash after payment confirms."],
    proofLabel: "USDT Transaction ID",
    proofHint: "Enter the transaction hash or transaction ID",
  },
};

export const METHOD_CHANNELS: Record<"bangladesh" | "binance", WalletKey[]> = {
  bangladesh: ["bKash", "Nagad"],
  binance: ["Binance Pay", "USDT TRC20", "USDT BEP20"],
};

export const METHOD_META = {
  bangladesh: { flag: "🇧🇩", title: "Bangladesh", sub: "bKash · Nagad" },
  binance: { flag: "◆", title: "Worldwide", sub: "Binance Pay · USDT" },
} as const;

export const PROMO_TEXT = {
  title: "Have a promo code?",
  placeholder: "e.g. WELCOME10",
  applyButton: "Apply",
  applying: "Checking…",
  removeButton: "Remove",
  appliedPrefix: "Applied",
  invalidFallback: "This promo code is not valid.",
  savingsLabel: "You save",
};

export const CHECKOUT_TEXT = {
  title: "Secure Checkout",
  subtitle: "Complete your payment, then enter one payment proof to submit your order for review.",
  steps: ["Your info", "Pay & verify", "Delivered"],
  infoTitle: "Your information",
  infoHint: "Delivery and order updates are sent to this Google email address.",
  payTitle: "Choose how you pay",
  payHint: "Select a payment method and follow the instructions below.",
  summaryTitle: "Order ticket",
  guaranteeNote: "Account details and instructions unlock on your order page after approval.",
  submitIdle: "Submit order",
  submitBusy: "Submitting order…",
  trackNote: "Save your payment proof. You can check status anytime in Track Your Orders.",
};
