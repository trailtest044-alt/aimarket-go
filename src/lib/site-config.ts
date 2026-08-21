export type WalletKey = "Easypaisa" | "JazzCash" | "Bank Transfer";

export type WalletTheme = {
  label: string; monogram: string; color: string; color2: string; ink: string; badge: string;
  numberLabel: string; steps: string[]; stepsBn: string[]; proofLabel: string; proofHint: string;
};

export const WALLETS: Record<WalletKey, WalletTheme> = {
  Easypaisa: {
    label: "Easypaisa", monogram: "EP", color: "#33A867", color2: "#8CC63F", ink: "#ffffff", badge: "Money Transfer", numberLabel: "Easypaisa Account",
    steps: ["Open Easypaisa and choose Money Transfer.", "Enter the account number shown below.", "Send the exact PKR amount from your order ticket.", "Copy the transaction ID from the confirmation.", "Paste the transaction ID below and submit your order."],
    stepsBn: [], proofLabel: "Easypaisa Transaction ID", proofHint: "From the Easypaisa confirmation screen or SMS",
  },
  JazzCash: {
    label: "JazzCash", monogram: "JC", color: "#C8102E", color2: "#F9A11B", ink: "#ffffff", badge: "Money Transfer", numberLabel: "JazzCash Account",
    steps: ["Open JazzCash and choose Money Transfer.", "Enter the account number shown below.", "Send the exact PKR amount from your order ticket.", "Copy the transaction ID from the confirmation.", "Paste the transaction ID below and submit your order."],
    stepsBn: [], proofLabel: "JazzCash Transaction ID", proofHint: "From the JazzCash confirmation screen or SMS",
  },
  "Bank Transfer": {
    label: "Bank Transfer", monogram: "BT", color: "#3B82F6", color2: "#8B5CF6", ink: "#ffffff", badge: "IBFT", numberLabel: "Bank Account / IBAN",
    steps: ["Open your bank app and start an IBFT transfer.", "Enter the account details shown below.", "Send the exact PKR amount from your order ticket.", "Copy the transfer reference from the receipt.", "Paste the reference below and submit your order."],
    stepsBn: [], proofLabel: "Bank Transfer Reference", proofHint: "The reference number from your bank receipt",
  },
};

export const METHOD_CHANNELS: Record<"bangladesh" | "pakistan" | "binance", WalletKey[]> = {
  bangladesh: [], pakistan: ["Easypaisa", "JazzCash", "Bank Transfer"], binance: [],
};

export const METHOD_META = {
  bangladesh: { flag: "", title: "Unavailable", sub: "" },
  pakistan: { flag: "🇵🇰", title: "Pakistan", sub: "Easypaisa · JazzCash · Bank" },
  binance: { flag: "", title: "Unavailable", sub: "" },
} as const;

export const PROMO_TEXT = {
  title: "Have a promo code?", titleBn: "Have a promo code?", placeholder: "e.g. WELCOME10", applyButton: "Apply", applying: "Checking…", removeButton: "Remove", appliedPrefix: "Applied", invalidFallback: "This promo code is not valid.", savingsLabel: "You save",
};

export const CHECKOUT_TEXT = {
  title: "Secure Checkout", subtitle: "Pay through a Pakistan gateway, then submit the transaction ID. Delivery unlocks after admin approval.", subtitleBn: "Pay through a Pakistan gateway, then submit the transaction ID.",
  steps: ["Your info", "Pay and verify", "Delivered"], infoTitle: "Your information", infoHint: "Your order and delivery are linked to this email address.", payTitle: "Choose how you pay", payHint: "Select Easypaisa, JazzCash, or bank transfer and follow the instructions.", summaryTitle: "Order ticket", guaranteeNote: "Account details or instructions unlock after admin approval.", submitIdle: "Submit order", submitBusy: "Submitting order…", trackNote: "Save your transaction ID so you can track the order at any time.",
};
