export type Product = {
  id: string;
  backendId?: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  icon: string;
  logoUrl?: string;
  shortDescription: string;
  description: string;
  features: string[];
  deliveryMethod: string;
  terms: string;
  stock: number;
  badge?: string;
};

export type StockItem = {
  id: string;
  productId: string;
  email: string;
  password: string;
  instructions: string;
  status: "available" | "delivered";
  createdAt: string;
};

export type Order = {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  contact: string;
  amount: number;
  paymentMethod: "bangladesh" | "pakistan" | "binance";
  paymentChannel: string;
  transactionId: string;
  customerOrderRef?: string;
  status: "pending" | "approved" | "delivered" | "rejected";
  createdAt: string;
};

export type PaymentSettings = {
  bangladesh: { bkash: string; nagad: string; instructions: string };
  pakistan: { easypaisa: string; jazzcash: string; bank: string; instructions: string };
  binance: { payId: string; wallet: string; instructions: string };
};

export const mockProducts: Product[] = [
  {
    id: "gemini-pro",
    name: "Gemini Advanced (1 Month)",
    category: "AI Assistants",
    price: 8.99,
    originalPrice: 19.99,
    icon: "✨",
    logoUrl: "https://www.gstatic.com/lamda/images/gemini_sparkle_v002_advanced_d3531dc1f1115492288c.svg",
    shortDescription: "Google Gemini Advanced with 2TB storage and Gemini 2.5 Pro access.",
    description:
      "Get full access to Google's most powerful AI assistant. Includes Gemini 2.5 Pro, Deep Research, and 2TB Google One cloud storage.",
    features: ["Gemini 2.5 Pro model", "Deep Research", "2TB Google One storage", "Priority access"],
    deliveryMethod: "Account credentials within 1-6 hours",
    terms: "Do not change account password or recovery info. Single user only.",
    stock: 12,
    badge: "Best Seller",
  },
  {
    id: "chatgpt-plus",
    name: "ChatGPT Plus (1 Month)",
    category: "AI Assistants",
    price: 9.99,
    originalPrice: 20,
    icon: "🤖",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg",
    shortDescription: "Full ChatGPT Plus with GPT-5, image generation, and advanced data analysis.",
    description:
      "Premium OpenAI account with GPT-5, browsing, code interpreter, DALL·E and custom GPTs.",
    features: ["GPT-5 access", "Image generation", "Code Interpreter", "Custom GPTs"],
    deliveryMethod: "Shared account login delivered via email",
    terms: "No password change. Do not enable 2FA.",
    stock: 7,
  },
  {
    id: "midjourney",
    name: "Midjourney Standard",
    category: "Image Generation",
    price: 14.99,
    originalPrice: 30,
    icon: "🎨",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Midjourney_Emblem.svg",
    shortDescription: "Midjourney standard plan with unlimited relax generations.",
    description: "Premium Midjourney subscription with fast hours and unlimited relaxed generations.",
    features: ["15h fast GPU", "Unlimited relax", "Stealth mode", "Commercial use"],
    deliveryMethod: "Discord invite + account access",
    terms: "Don't share account further. Personal use only.",
    stock: 5,
  },
  {
    id: "ideogram",
    name: "Ideogram Plus",
    category: "Image Generation",
    price: 6.99,
    icon: "🖼️",
    logoUrl: "https://ideogram.ai/assets/image/balanced/response/d_oo49QmS2WPGEcKuO61gw",
    shortDescription: "Ideogram Plus for typography-perfect AI images.",
    description: "AI image generation with industry-leading typography and prompt accuracy.",
    features: ["Unlimited slow", "Priority queue", "Private mode", "Style refs"],
    deliveryMethod: "Login credentials within 30 minutes",
    terms: "Single device usage.",
    stock: 18,
  },
  {
    id: "recraft",
    name: "Recraft Pro",
    category: "Image Generation",
    price: 7.99,
    icon: "🧩",
    logoUrl: "https://www.recraft.ai/favicon.ico",
    shortDescription: "Recraft Pro vector + raster AI design suite.",
    description: "Generate vector graphics, brand styles, and mockups with AI.",
    features: ["Vector export", "Brand styles", "Mockups", "Background removal"],
    deliveryMethod: "Account access via email",
    terms: "Do not change billing details.",
    stock: 9,
  },
  {
    id: "claude-pro",
    name: "Claude Pro",
    category: "AI Assistants",
    price: 11.99,
    icon: "🧠",
    logoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/14/Anthropic.png",
    shortDescription: "Anthropic Claude Pro with Claude 4 Opus access.",
    description: "Long-context conversations, projects, and Claude 4 Opus reasoning.",
    features: ["Claude 4 Opus", "Projects", "200K context", "Artifacts"],
    deliveryMethod: "Account credentials",
    terms: "No password change.",
    stock: 0,
    badge: "Out soon",
  },
  {
    id: "perplexity",
    name: "Perplexity Pro",
    category: "Research",
    price: 4.99,
    originalPrice: 20,
    icon: "🔎",
    logoUrl: "https://www.perplexity.ai/favicon.ico",
    shortDescription: "Perplexity Pro yearly with unlimited Pro searches.",
    description: "AI-powered research engine with unlimited Pro searches and file uploads.",
    features: ["Unlimited Pro search", "File uploads", "GPT-5 / Claude", "API credits"],
    deliveryMethod: "Activation link via email",
    terms: "1 year subscription.",
    stock: 23,
    badge: "Hot Deal",
  },
  {
    id: "canva-pro",
    name: "Canva Pro (1 Year)",
    category: "Design",
    price: 12.99,
    icon: "🎯",
    logoUrl: "https://static.canva.com/static/images/favicon-1.ico",
    shortDescription: "Canva Pro yearly with all premium assets and AI tools.",
    description: "Full Canva Pro subscription including Magic Studio AI features.",
    features: ["100M+ assets", "Magic Studio AI", "Brand kit", "Background remover"],
    deliveryMethod: "Invite to team within 1 hour",
    terms: "Use your own email.",
    stock: 31,
  },
];

export const mockCategories = [
  { id: "all", name: "All Products", icon: "🌐" },
  { id: "AI Assistants", name: "AI Assistants", icon: "🤖" },
  { id: "Image Generation", name: "Image Generation", icon: "🎨" },
  { id: "Research", name: "Research", icon: "🔎" },
  { id: "Design", name: "Design", icon: "🎯" },
];

export const mockOrders: Order[] = [
  {
    id: "ORD-1042",
    productId: "gemini-pro",
    productName: "Gemini Advanced (1 Month)",
    customerName: "Rahim Uddin",
    customerEmail: "rahim@example.com",
    contact: "+8801712345678",
    amount: 8.99,
    paymentMethod: "bangladesh",
    paymentChannel: "bKash",
    transactionId: "9XK2L8P",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: "ORD-1041",
    productId: "chatgpt-plus",
    productName: "ChatGPT Plus (1 Month)",
    customerName: "Ali Khan",
    customerEmail: "ali@example.com",
    contact: "@alikhan",
    amount: 9.99,
    paymentMethod: "pakistan",
    paymentChannel: "JazzCash",
    transactionId: "JC88224",
    status: "pending",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "ORD-1040",
    productId: "perplexity",
    productName: "Perplexity Pro",
    customerName: "Sara Ahmed",
    customerEmail: "sara@example.com",
    contact: "+923001234567",
    amount: 4.99,
    paymentMethod: "binance",
    paymentChannel: "Binance Pay",
    transactionId: "0xabc123def456",
    status: "approved",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: "ORD-1039",
    productId: "canva-pro",
    productName: "Canva Pro (1 Year)",
    customerName: "Nadia Khan",
    customerEmail: "nadia@example.com",
    contact: "+8801911223344",
    amount: 12.99,
    paymentMethod: "bangladesh",
    paymentChannel: "Nagad",
    transactionId: "NG77123",
    status: "delivered",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "ORD-1038",
    productId: "midjourney",
    productName: "Midjourney Standard",
    customerName: "Imran Hossain",
    customerEmail: "imran@example.com",
    contact: "@imran",
    amount: 14.99,
    paymentMethod: "binance",
    paymentChannel: "USDT TRC20",
    transactionId: "0xdeadbeef",
    status: "rejected",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

export const mockStock: StockItem[] = [
  {
    id: "STK-1",
    productId: "gemini-pro",
    email: "gemini.user01@mailbox.com",
    password: "********",
    instructions: "Login at gemini.google.com. Do not change password.",
    status: "available",
    createdAt: new Date().toISOString(),
  },
  {
    id: "STK-2",
    productId: "chatgpt-plus",
    email: "chatgpt.user07@mailbox.com",
    password: "********",
    instructions: "Login at chat.openai.com. Single device.",
    status: "available",
    createdAt: new Date().toISOString(),
  },
  {
    id: "STK-3",
    productId: "midjourney",
    email: "discord.user@mailbox.com",
    password: "********",
    instructions: "Accept Discord invite link.",
    status: "delivered",
    createdAt: new Date().toISOString(),
  },
];

export const mockPaymentSettings: PaymentSettings = {
  bangladesh: {
    bkash: "01XXX-XXXXXX",
    nagad: "01YYY-YYYYYY",
    instructions:
      "Send Money to the number above (Personal, not Merchant). After payment, enter your Transaction ID and Order ID below.",
  },
  pakistan: {
    easypaisa: "0300-XXXXXXX",
    jazzcash: "0301-YYYYYYY",
    bank: "HBL — 1234-5678-9012 (Account Title: Demo Seller)",
    instructions:
      "Transfer the exact amount to any of the above accounts. Add your Order ID in the reference / remarks field.",
  },
  binance: {
    payId: "123456789",
    wallet: "TXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (USDT — TRC20)",
    instructions:
      "Send USDT (TRC20) or use Binance Pay ID. Paste the transaction hash and your Order ID below after sending.",
  },
};
