/** Live API layer for the Render + MongoDB backend. */
import {
  mockProducts,
  mockOrders,
  mockStock,
  mockPaymentSettings,
  mockCategories,
  type Product,
  type Order,
  type StockItem,
  type MailTxtAccount,
  type MailTxtFile,
  type PaymentSettings,
  type PriceRegion,
  type CurrencyCode,
  type DeliveryMode,
  type ManualInputMode,
  type AdminUser,
  type DashboardStats,
  type ProductSalesRow,
  type ActivityLog,
  type AttentionItem,
  type DashboardChartRow,
  type DashboardKpi,
  type DashboardStatusRow,
  type ProductPerformanceRow,
  type TopCustomerRow,
  type PromoCode,
  type AppliedPromo,
  mockPromoCodes,
} from "./mock-data";

const DEFAULT_API_BASE_URL = "https://aimarket-u138.onrender.com/api";

export const API_BASE_URL: string =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_BASE_URL).replace(/\/$/, "");

export const IS_MOCK_MODE = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";

const STORAGE_KEYS = {
  products: "mp_products",
  orders: "mp_orders",
  stock: "mp_stock",
  deliveries: "mp_deliveries",
  mailTxtFiles: "mp_mail_txt_files",
  payment: "mp_payment_settings",
  admin: "mp_admin_auth",
  token: "mp_admin_token",
  adminInfo: "mp_admin_info",
  customerToken: "mp_customer_token",
  customerInfo: "mp_customer_info",
  orderTokens: "mp_order_tokens",
  region: "mp_price_region_v3",

  visitorId: "mp_visitor_id_v1",
  visitorSessionId: "mp_visitor_session_v1",
  productsFallback: "mp_products_fallback_v1",
};

const isBrowser = typeof window !== "undefined";
const objectIdRe = /^[a-f\d]{24}$/i;
const REGION_CACHE_VERSION = 9;
const PRODUCT_DEDUPE_MS = 30_000;
let productsInFlight: Promise<Product[]> | null = null;
let productsCache: { at: number; list: Product[] } | null = null;
function clearProductsCache() {
  productsCache = null;
  productsInFlight = null;
  if (isBrowser) window.localStorage.removeItem(STORAGE_KEYS.productsFallback);
}
type StoredRegion = PriceRegion | { region?: PriceRegion; country?: string; ts?: number; version?: number } | null;

function load<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function save<T>(key: string, value: T) { if (isBrowser) window.localStorage.setItem(key, JSON.stringify(value)); }
function delay<T>(value: T, ms = 200): Promise<T> { return new Promise((res) => setTimeout(() => res(value), ms)); }
function getToken(): string | null { return isBrowser ? window.localStorage.getItem(STORAGE_KEYS.token) : null; }
function getCustomerToken(): string | null { return isBrowser ? window.localStorage.getItem(STORAGE_KEYS.customerToken) : null; }
function getOrderTokens(): Record<string, string> { return load<Record<string, string>>(STORAGE_KEYS.orderTokens, {}); }
function saveOrderToken(orderId: string, token: string) { if (!token) return; const tokens = getOrderTokens(); tokens[orderId] = token; save(STORAGE_KEYS.orderTokens, tokens); }
function getOrderToken(orderId: string): string | null { return getOrderTokens()[orderId] || null; }

type HttpRequestInit = RequestInit & { timeoutMs?: number };

async function http<T>(path: string, init: HttpRequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) };
  const token = path.startsWith("/admin") ? getToken() : getCustomerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 12000);
  const { timeoutMs: _timeoutMs, ...fetchInit } = init;
  let res: Response;
  try { res = await fetch(`${API_BASE_URL}${path}`, { ...fetchInit, headers, signal: init.signal || controller.signal, cache: "no-store" }); }
  catch (error) { if ((error as Error)?.name === "AbortError") throw new Error("The server took too long to respond. Please try again."); throw error; }
  finally { clearTimeout(timeout); }
  if (!res.ok) {
    if (path.startsWith("/admin") && (res.status === 401 || res.status === 403) && isBrowser) {
      window.localStorage.removeItem(STORAGE_KEYS.admin);
      window.localStorage.removeItem(STORAGE_KEYS.token);
      window.localStorage.removeItem(STORAGE_KEYS.adminInfo);
      if (!window.location.pathname.startsWith("/admin/login")) window.location.href = "/admin/login";
    }
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
      if (data?.error) message = data.error;
      const firstIssue = Array.isArray(data?.details) ? data.details[0] : null;
      if (firstIssue?.message) {
        const field = Array.isArray(firstIssue.path) && firstIssue.path.length ? `${firstIssue.path.join(".")}: ` : "";
        message = `${field}${firstIssue.message}`;
      }
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

function anonymousId(storage: Storage, key: string): string {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const next = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  storage.setItem(key, next);
  return next;
}

// Privacy-safe traffic measurement: this sends an anonymous browser ID only.
export async function trackAnonymousVisit(path: string): Promise<void> {
  if (!isBrowser || IS_MOCK_MODE || path.startsWith("/admin")) return;
  try {
    const visitorId = anonymousId(window.localStorage, STORAGE_KEYS.visitorId);
    const sessionId = anonymousId(window.sessionStorage, STORAGE_KEYS.visitorSessionId);
    await fetch(`${API_BASE_URL}/analytics/visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, sessionId, path, referrer: document.referrer || "" }),
      keepalive: true,
      cache: "no-store",
    });
  } catch {
    // Analytics must never interrupt browsing or checkout.
  }
}

type BackendProduct = {
  _id: string; title: string; slug: string; description?: string; shortDescription?: string; category?: string; imageUrl?: string;
  badge?: string; icon?: string; priceBDT?: number; pricePKR?: number; priceUSDT?: number; isFree?: boolean; worldwideCurrency?: "USDT" | "USD";
  originalPriceBDT?: number; originalPricePKR?: number; originalPriceUSDT?: number; features?: string[];
  purchaseCostBDT?: number; purchaseCostPKR?: number; purchaseCostUSDT?: number;
  accountCostBDT?: number; accountCostPKR?: number; accountCostUSDT?: number;
  paymentGatewayFeeBDT?: number; paymentGatewayFeePKR?: number; paymentGatewayFeeUSDT?: number;
  otherExpenseBDT?: number; otherExpensePKR?: number; otherExpenseUSDT?: number;
  deliveryMode?: DeliveryMode; deliveryMethod?: string; deliveryInstruction?: string; deliveryVideoUrl?: string; deliveryImageUrl?: string; passwordInstructionVideoUrl?: string; manualInputMode?: ManualInputMode; backorderStock?: number; actualStock?: number; backorderAvailable?: number; terms?: string; isActive?: boolean; isDeleted?: boolean; sortOrder?: number; availableStock?: number;
  createdByNickname?: string; updatedByNickname?: string; displayPrice?: { amount: number; currency: CurrencyCode; region: PriceRegion }; resellerPrice?: boolean;
};

type BackendPaymentMethod = { key: "bangladesh" | "pakistan" | "binance"; title: string; instructions: string; accounts?: { label?: string; value?: string; note?: string }[]; isActive?: boolean; };
type BackendOrder = {
  _id?: string; orderId: string; productId?: string | { _id?: string; title?: string; slug?: string };
  productSnapshot?: { title?: string; logoUrl?: string; icon?: string; price?: number; currency?: CurrencyCode; priceRegion?: PriceRegion; deliveryMode?: DeliveryMode; deliveryInstruction?: string; deliveryVideoUrl?: string; deliveryImageUrl?: string; manualInputMode?: ManualInputMode };
  product?: { title?: string; logoUrl?: string; icon?: string; price?: number; currency?: CurrencyCode; priceRegion?: PriceRegion; deliveryMode?: DeliveryMode; deliveryInstruction?: string; deliveryVideoUrl?: string; deliveryImageUrl?: string; manualInputMode?: ManualInputMode };
  customer?: { name?: string; email?: string; whatsapp?: string };
  paymentMethod: "bangladesh" | "pakistan" | "binance" | "reseller_due" | "free"; priceRegion?: PriceRegion; transactionId?: string; paymentNote?: string; customerOrderRef?: string; batchId?: string;
  status: Order["status"]; createdAt?: string; reviewedAt?: string; rejectReason?: string | null; cancelReason?: string | null; cancelledAt?: string; deliveryAvailable?: boolean; manualActivationRequired?: boolean; manualActivationSubmitted?: boolean; manualActivationActivated?: boolean; fulfillment?: { isBackorder?: boolean; deliveryDetailsAddedAt?: string | null };
  approvedByNickname?: string; deliveredByNickname?: string; rejectedByNickname?: string; cancelledByNickname?: string; reviewedByNickname?: string;
};
type BackendStock = { _id: string; productId?: string | { _id?: string; title?: string; slug?: string }; status: "available" | "reserved" | "delivered" | "disabled" | "cancelled"; adminNote?: string; createdAt?: string; payload?: { deliveryMode?: DeliveryMode; email?: string; password?: string; activationCode?: string; instruction?: string; videoUrl?: string; imageUrl?: string; getCodeAccessDays?: number }; createdByNickname?: string; };
type BackendMailTxtFile = Omit<MailTxtFile, "id"> & { _id?: string; id?: string };

export type DeliveryPayload = { deliveryMode?: DeliveryMode; email?: string; password?: string; activationCode?: string; instruction?: string; instructions?: string; videoUrl?: string; imageUrl?: string; canFetchLoginCode?: boolean; getCodeAccessDays?: number; getCodeAccessExpiresAt?: string; extra?: Record<string, unknown>; };
export type LoginCodeResult = { code: string; subject?: string; receivedAt?: string; preview?: string };
export type CustomerSession = { id?: string; name: string; email: string; picture?: string };
export type ResellerProfile = { id: string; name: string; email: string; status: "invited" | "active" | "suspended"; creditLimitBDT: number; balances: Record<string, number> };
export type ResellerLedgerEntry = { _id?: string; id?: string; orderId?: string; kind: "order_charge" | "order_reversal" | "payment" | "discount"; currency: CurrencyCode; amount: number; note?: string; paymentReference?: string; receiptNo?: string; createdAt: string; };
export type AdminUserProfile = { id: string; name: string; email: string; picture?: string; joinedAt?: string | null; lastLoginAt?: string | null; reseller?: { id: string; status: string } | null };
export type AdminReseller = ResellerProfile & { customerId?: string | null; internalNote?: string; joinedAt?: string | null; lastEntryAt?: string | null; transactionCount?: number; visibleProductCount?: number; openInvoiceCount?: number; creditUsedBDT?: number; creditAvailableBDT?: number | null };
export type ResellerProductConfig = { product: BackendProduct; access: { _id?: string; isVisible: boolean; priceBDT?: number | null; pricePKR?: number | null; priceUSDT?: number | null; priceUSD?: number | null; note?: string } | null };
export type ResellerInvoice = { _id?: string; id?: string; orderId: string; productTitle: string; currency: CurrencyCode; originalAmount: number; paidAmount: number; discountAmount: number; remainingAmount: number; status: "open" | "partial" | "paid" | "void"; lastReceiptNo?: string; voidReason?: string; createdAt: string };
export type ResellerPaymentRequest = { _id?: string; id?: string; resellerId: string; amount: number; currency: CurrencyCode; channel: "bkash" | "nagad"; transactionId: string; note?: string; status: "pending" | "approved" | "rejected"; receiptNo?: string; createdAt: string; approvedAt?: string; rejectedAt?: string; reseller?: AdminReseller | null };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || `product-${Date.now()}`; }
function money(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function formatMoney(amount: number, currency: CurrencyCode = "PKR") {
  return `Rs ${Math.round(Number(amount) || 0).toLocaleString("en-PK")}`;
}
export function priceForRegion(product: Product, region: PriceRegion) {
  return { amount: Number(product.pricePKR || product.price || 0), currency: "PKR" as CurrencyCode };
}
export function methodForRegion(region: PriceRegion): "pakistan" { return "pakistan"; }
export function allowedPaymentMethods(region: PriceRegion): Array<"pakistan"> { return ["pakistan"]; }
export function priceRegionForPaymentMethod(method: Order["paymentMethod"]): PriceRegion { return "pk"; }

function freshPath(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_=${Date.now()}`;
}

function normalizeCountryCode(value: unknown): string {
  return String(value || "").trim().toUpperCase().slice(0, 2);
}

function regionFromCountry(country: string): PriceRegion {
  if (country === "BD") return "bd";
  if (country === "PK") return "pk";
  return "world";
}

function normalizeStoredRegion(value: StoredRegion): PriceRegion {
  if (value === "bd" || value === "pk" || value === "world") return value;
  if (value && typeof value === "object" && (value.region === "bd" || value.region === "pk" || value.region === "world")) return value.region;
  return "world";
}

function browserCountryHint(): string {
  if (!isBrowser) return "";
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone === "Asia/Dhaka") return "BD";
  if (timeZone === "Asia/Karachi") return "PK";

  const languageHints = [navigator.language, ...(navigator.languages || [])]
    .map((language) => language.toUpperCase());
  if (languageHints.some((language) => language.endsWith("-BD") || language.includes("BN-BD"))) return "BD";
  if (languageHints.some((language) => language.endsWith("-PK") || language.includes("UR-PK"))) return "PK";
  return "";
}

async function detectClientCountry(): Promise<string> {
  const providers: Array<{ url: string; read: (data: any) => unknown }> = [
    { url: "https://ipapi.co/json/", read: (data) => data.country_code },
    { url: "https://ipwho.is/", read: (data) => data.success === false ? "" : data.country_code },
    { url: "https://get.geojs.io/v1/ip/country.json", read: (data) => data.country },
    { url: "https://api.country.is/", read: (data) => data.country },
  ];

  const countries = (await Promise.all(providers.map(async (provider) => {
    try {
      const res = await fetch(freshPath(provider.url), { cache: "no-store" });
      if (!res.ok) return "";
      return normalizeCountryCode(provider.read(await res.json()));
    } catch {}
    return "";
  }))).filter(Boolean);

  if (!countries.length) return "";
  const counts = countries.reduce<Record<string, number>>((acc, countryCode) => {
    acc[countryCode] = (acc[countryCode] || 0) + 1;
    return acc;
  }, {});
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (ranked[0]?.[1] > ranked[1]?.[1]) return ranked[0][0];

  // If providers disagree, prefer the latest non-empty answer instead of
  // pinning the first provider forever. This helps when a user switches VPN.
  return countries[countries.length - 1] || "";
}

function productToFrontend(p: BackendProduct): Product {
  const pricePKR = p.pricePKR == null && p.displayPrice?.region === "pk" ? money(p.displayPrice.amount) : money(p.pricePKR);
  return {
    id: p.slug || p._id,
    backendId: p._id,
    name: p.title,
    category: p.category || "AI Tools",
    price: pricePKR,
    currency: "PKR",
    priceRegion: "pk",
    priceBDT: 0, pricePKR, priceUSDT: 0,
    isFree: false,
    worldwideCurrency: p.worldwideCurrency || "USDT",
    originalPrice: money(p.originalPricePKR),
    originalPriceBDT: money(p.originalPriceBDT), originalPricePKR: money(p.originalPricePKR), originalPriceUSDT: money(p.originalPriceUSDT),
    purchaseCostBDT: money(p.purchaseCostBDT), purchaseCostPKR: money(p.purchaseCostPKR), purchaseCostUSDT: money(p.purchaseCostUSDT),
    accountCostBDT: money(p.accountCostBDT), accountCostPKR: money(p.accountCostPKR), accountCostUSDT: money(p.accountCostUSDT),
    paymentGatewayFeeBDT: money(p.paymentGatewayFeeBDT), paymentGatewayFeePKR: money(p.paymentGatewayFeePKR), paymentGatewayFeeUSDT: money(p.paymentGatewayFeeUSDT),
    otherExpenseBDT: money(p.otherExpenseBDT), otherExpensePKR: money(p.otherExpensePKR), otherExpenseUSDT: money(p.otherExpenseUSDT),
    icon: p.icon || "\u2728",
    logoUrl: p.imageUrl || undefined,
    badge: p.badge || undefined,
    shortDescription: p.shortDescription || p.description || "",
    description: p.description || p.shortDescription || "",
    features: Array.isArray(p.features) ? p.features : [],
    deliveryMode: p.deliveryMode || "credentials",
    deliveryMethod: p.deliveryMethod || "Account login details will be delivered after admin approval.",
    deliveryInstruction: p.deliveryInstruction || "",
    deliveryVideoUrl: p.deliveryVideoUrl || "",
    deliveryImageUrl: p.deliveryImageUrl || "",
    passwordInstructionVideoUrl: p.passwordInstructionVideoUrl || "",
    manualInputMode: p.manualInputMode || "ideogram_credentials",
    terms: p.terms || "Do not change password/recovery info unless instructed by admin.",
    stock: money(p.availableStock ?? 0),
    backorderStock: money(p.backorderStock ?? 0),
    addedBy: p.createdByNickname || "",
    updatedBy: p.updatedByNickname || "",
    isActive: p.isActive !== false,
    sortOrder: Number(p.sortOrder || 0),
  };
}

function productToBackend(p: Product) {
  const slug = /^[a-z0-9-]+$/.test(p.id) ? p.id : slugify(p.name);
  const clean = (value: unknown, max: number) => String(value || "").trim().slice(0, max);
  return {
    title: clean(p.name, 120), slug: clean(slug, 140), description: clean(p.description, 5000), shortDescription: clean(p.shortDescription, 300), category: clean(p.category || "AI Tools", 80),
    imageUrl: clean(p.logoUrl, 1000), badge: clean(p.badge, 60), icon: clean(p.icon || "\u2728", 10),
    priceBDT: 0, pricePKR: money(p.pricePKR || p.price), priceUSDT: 0, isFree: false, worldwideCurrency: "USDT" as const,
    originalPriceBDT: money(p.originalPriceBDT), originalPricePKR: money(p.originalPricePKR), originalPriceUSDT: money(p.originalPriceUSDT),
    purchaseCostBDT: 0, purchaseCostPKR: money(p.purchaseCostPKR), purchaseCostUSDT: 0,
    accountCostBDT: 0, accountCostPKR: 0, accountCostUSDT: 0,
    paymentGatewayFeeBDT: 0, paymentGatewayFeePKR: 0, paymentGatewayFeeUSDT: 0,
    otherExpenseBDT: 0, otherExpensePKR: 0, otherExpenseUSDT: 0,
    features: (p.features || []).map((feature) => clean(feature, 160)).filter(Boolean), deliveryMode: p.deliveryMode || "credentials", deliveryMethod: clean(p.deliveryMethod, 300), deliveryInstruction: clean(p.deliveryInstruction, 8000), deliveryVideoUrl: clean(p.deliveryVideoUrl, 1000), deliveryImageUrl: clean(p.deliveryImageUrl, 1000), passwordInstructionVideoUrl: clean(p.passwordInstructionVideoUrl, 1000), manualInputMode: p.manualInputMode || "ideogram_credentials", backorderStock: Math.max(0, Math.floor(money(p.backorderStock))), terms: clean(p.terms, 2000), isActive: p.isActive !== false, sortOrder: Number(p.sortOrder || 0),
  };
}
function getAccount(method: BackendPaymentMethod | undefined, labelIncludes: string) { return method?.accounts?.find((a) => (a.label || "").toLowerCase().includes(labelIncludes))?.value || ""; }
function paymentToFrontend(methods: BackendPaymentMethod[]): PaymentSettings {
  const bd = methods.find((m) => m.key === "bangladesh"); const pk = methods.find((m) => m.key === "pakistan"); const bn = methods.find((m) => m.key === "binance");
  return {
    bangladesh: { bkash: getAccount(bd, "bkash"), nagad: getAccount(bd, "nagad"), instructions: bd?.instructions || mockPaymentSettings.bangladesh.instructions },
    pakistan: { easypaisa: getAccount(pk, "easypaisa"), jazzcash: getAccount(pk, "jazzcash"), bank: getAccount(pk, "bank"), instructions: pk?.instructions || mockPaymentSettings.pakistan.instructions },
    binance: { payId: getAccount(bn, "pay"), wallet: getAccount(bn, "wallet"), instructions: bn?.instructions || mockPaymentSettings.binance.instructions },
  };
}
function parsePaymentNote(note?: string) { const text = note || ""; const channel = text.match(/Channel:\s*([^;]+)/i)?.[1]?.trim() || "Manual"; const ref = text.match(/Reference:\s*([^;]+)/i)?.[1]?.trim() || undefined; return { channel, ref }; }
function normalizeOrderStatus(value: unknown): Order["status"] {
  const status = String(value || "pending").trim().toLowerCase();
  if (["delivered", "completed", "complete", "fulfilled"].includes(status)) return "delivered";
  if (["approved", "paid", "confirmed", "processing"].includes(status)) return "approved";
  if (["rejected", "declined", "failed"].includes(status)) return "rejected";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  return "pending";
}
function orderToFrontend(o: BackendOrder): Order {
  const legacy = o as BackendOrder & Record<string, any>;
  const note = parsePaymentNote(o.paymentNote); const snap = o.productSnapshot || o.product || legacy.productDetails; const productId = typeof o.productId === "object" ? (o.productId.slug || o.productId._id || "") : (o.productId || legacy.productSlug || "");
  return {
    id: o.orderId || legacy.id || legacy._id || "", productId, productName: snap?.title || legacy.productName || (typeof o.productId === "object" ? o.productId.title : "") || "Product", productLogoUrl: snap?.logoUrl || legacy.productLogoUrl || "", productIcon: snap?.icon || legacy.productIcon || "✨", batchId: o.batchId || legacy.batch || "",
    customerName: o.customer?.name || legacy.customerName || "", customerEmail: o.customer?.email || legacy.customerEmail || legacy.email || "", contact: o.customer?.whatsapp || legacy.contact || legacy.whatsapp || "",
    amount: money(snap?.price ?? legacy.amount ?? legacy.price), currency: "PKR", priceRegion: "pk",
    paymentMethod: (o.paymentMethod || "pakistan") as Order["paymentMethod"], paymentChannel: note.channel || legacy.paymentChannel || "Pakistan", transactionId: o.transactionId || legacy.txid || legacy.transactionID || "", customerOrderRef: o.customerOrderRef || legacy.reference || note.ref,
    status: normalizeOrderStatus(o.status), createdAt: o.createdAt || legacy.date || new Date().toISOString(), approvedByNickname: o.approvedByNickname || "", deliveredByNickname: o.deliveredByNickname || "", rejectedByNickname: o.rejectedByNickname || "", cancelledByNickname: o.cancelledByNickname || "", cancelledAt: o.cancelledAt || "", cancelReason: o.cancelReason || "", reviewedByNickname: o.reviewedByNickname || "", deliveryMode: snap?.deliveryMode, deliveryVideoUrl: snap?.deliveryVideoUrl || "", manualInputMode: snap?.manualInputMode || "ideogram_credentials", manualActivationRequired: snap?.deliveryMode === "manual" || Boolean(o.manualActivationRequired), manualActivationSubmitted: Boolean((o as any).manualActivationSubmittedAt || o.manualActivationSubmitted), manualActivationActivated: Boolean((o as any).manualActivationActivatedAt || o.manualActivationActivated), isBackorder: Boolean(o.fulfillment?.isBackorder || (snap as any)?.backorder), deliveryDetailsAdded: Boolean(o.fulfillment?.deliveryDetailsAddedAt),
  };
}
function stockToFrontend(s: BackendStock): StockItem { const productId = typeof s.productId === "object" ? (s.productId.slug || s.productId._id || "") : (s.productId || ""); return { id: s._id, productId, deliveryMode: s.payload?.deliveryMode || "credentials", email: s.payload?.email || "Encrypted", password: s.payload?.password ? "********" : "Encrypted", activationCode: s.payload?.activationCode ? "********" : undefined, instructions: s.payload?.instruction || s.adminNote || "Encrypted delivery item", videoUrl: s.payload?.videoUrl, imageUrl: s.payload?.imageUrl, getCodeAccessDays: Number(s.payload?.getCodeAccessDays || 25), status: s.status === "available" ? "available" : "delivered", createdAt: s.createdAt || new Date().toISOString(), addedBy: s.createdByNickname || "" }; }
function mailTxtFileFromBackend(f: BackendMailTxtFile): MailTxtFile { return { ...f, id: f.id || f._id || `mail-${Date.now()}`, accountCount: Number(f.accountCount || f.accounts?.length || 0), dateAdded: Number(f.dateAdded || Date.now()) }; }
function parseMailTxtAccounts(text: string): MailTxtAccount[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => parts.length >= 4 && parts[0].includes("@") && parts[2] && parts[3])
    .map((parts) => ({ email: parts[0], password: parts[1] || "", refreshToken: parts[2], clientId: parts[3] }));
}
async function resolveBackendProductId(productIdOrSlug: string): Promise<string> { if (objectIdRe.test(productIdOrSlug)) return productIdOrSlug; const product = await getProductById(productIdOrSlug); return product?.backendId || productIdOrSlug; }
function stockToDelivery(s: StockItem): DeliveryPayload {
  return {
    deliveryMode: s.deliveryMode || "credentials",
    email: s.email,
    password: s.deliveryMode === "credentials" ? s.password : undefined,
    activationCode: s.deliveryMode === "activation_code" ? s.activationCode : undefined,
    instruction: s.instructions,
    videoUrl: s.videoUrl,
    imageUrl: s.imageUrl,
    getCodeAccessDays: s.getCodeAccessDays || 25,
    canFetchLoginCode: s.deliveryMode === "login_code",
  };
}

export async function getVisitorRegion(): Promise<{ region: PriceRegion; country?: string }> {
  if (isBrowser) {
    window.localStorage.removeItem("mp_region_override");
    window.sessionStorage.removeItem("mp_region_override");
  }
  const result = { region: "pk" as PriceRegion, country: "PK", ts: Date.now(), version: REGION_CACHE_VERSION };
  save(STORAGE_KEYS.region, result);
  return result;
}

export function getCurrentCustomer(): CustomerSession | null {
  return isBrowser ? load<CustomerSession | null>(STORAGE_KEYS.customerInfo, null) : null;
}

export function getCustomerAuthToken(): string | null {
  return getCustomerToken();
}

export function saveCustomerSession(token: string, customer: CustomerSession) {
  if (!isBrowser) return;
  window.localStorage.setItem(STORAGE_KEYS.customerToken, token);
  save(STORAGE_KEYS.customerInfo, customer);
  clearProductsCache();
  window.dispatchEvent(new Event("customer-auth-changed"));
}

export function logoutCustomer() {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEYS.customerToken);
  window.localStorage.removeItem(STORAGE_KEYS.customerInfo);
  clearProductsCache();
  window.dispatchEvent(new Event("customer-auth-changed"));
}

export function startGoogleLogin(returnTo = "/account") {
  if (!isBrowser) return;
  const origin = window.location.origin;
  window.location.assign(`${API_BASE_URL}/auth/google/start?returnTo=${encodeURIComponent(returnTo)}&origin=${encodeURIComponent(origin)}`);
}

export async function refreshCurrentCustomer(): Promise<CustomerSession | null> {
  if (IS_MOCK_MODE) return getCurrentCustomer();
  if (!getCustomerToken()) return null;
  try {
    const data = await http<{ customer: CustomerSession }>("/auth/customer/me");
    saveCustomerSession(getCustomerToken() || "", data.customer);
    return data.customer;
  } catch {
    logoutCustomer();
    return null;
  }
}

export async function getProducts(): Promise<Product[]> {
  if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.products, mockProducts));
  const now = Date.now();
  if (productsCache && now - productsCache.at < PRODUCT_DEDUPE_MS) return productsCache.list;
  if (productsInFlight) return productsInFlight;
  productsInFlight = (async () => {
    try {
      const visitor = await getVisitorRegion();
      const data = await http<{ products: BackendProduct[] }>(freshPath(`/products?region=${visitor.region}&country=${encodeURIComponent(visitor.country || "XX")}`));
      const list = data.products.map(productToFrontend).sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
      productsCache = { at: Date.now(), list };
      save(STORAGE_KEYS.productsFallback, list);
      return list;
    } catch (error) {
      const fallback = load<Product[]>(STORAGE_KEYS.productsFallback, []);
      if (fallback.length) { productsCache = { at: Date.now(), list: fallback }; return fallback; }
      throw error;
    }
  })();
  try {
    return await productsInFlight;
  } finally {
    productsInFlight = null;
  }
}
export async function getAdminProducts(): Promise<Product[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.products, mockProducts)); const data = await http<{ products: BackendProduct[] }>("/admin/products"); return data.products.filter((p) => p.isDeleted !== true).map(productToFrontend).sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name)); }

export async function reorderProducts(items: Array<{ id: string; backendId?: string; sortOrder: number }>): Promise<Product[]> {
  if (IS_MOCK_MODE) {
    const list = await getProducts();
    const orderMap = new Map(items.map((item) => [item.id, item.sortOrder]));
    const updated = list
      .map((p) => ({ ...p, sortOrder: orderMap.get(p.id) ?? p.sortOrder ?? 999999 }))
      .sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999));
    save(STORAGE_KEYS.products, updated);
    return delay(updated);
  }

  const payload = {
    products: await Promise.all(
      items.map(async (item) => ({
        id: item.backendId || (objectIdRe.test(item.id) ? item.id : await resolveBackendProductId(item.id)),
        sortOrder: Number(item.sortOrder || 0),
      })),
    ),
  };
  const data = await http<{ products: BackendProduct[] }>("/admin/products/reorder", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  clearProductsCache();
  return data.products.map(productToFrontend).sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<Product | null> { if (IS_MOCK_MODE) { const list = await getProducts(); return list.find((p) => p.id === id || p.backendId === id) ?? null; } try { const visitor = await getVisitorRegion(); if (objectIdRe.test(id)) { const list = await getProducts(); return list.find((p) => p.backendId === id) ?? null; } const data = await http<{ product: BackendProduct }>(freshPath(`/products/${id}?region=${visitor.region}&country=${encodeURIComponent(visitor.country || "XX")}`)); return productToFrontend(data.product); } catch { return null; } }
export type NewProductResellerAssignment = { resellerId: string; priceBDT: number | null; pricePKR: number | null; priceUSDT: number | null };
export async function createProduct(p: Product, resellerAssignments: NewProductResellerAssignment[] = []): Promise<Product> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, [p, ...list]); return delay(p); } const data = await http<{ product: BackendProduct }>("/admin/products", { method: "POST", body: JSON.stringify({ ...productToBackend(p), resellerAssignments }) }); clearProductsCache(); return productToFrontend(data.product); }
export async function updateProduct(p: Product): Promise<Product> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, list.map((x) => (x.id === p.id ? p : x))); return delay(p); } const backendId = p.backendId || (await resolveBackendProductId(p.id)); const data = await http<{ product: BackendProduct }>(`/admin/products/${backendId}`, { method: "PATCH", body: JSON.stringify(productToBackend(p)) }); clearProductsCache(); return productToFrontend(data.product); }
export async function deleteProduct(id: string): Promise<void> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, list.filter((x) => x.id !== id)); return delay(undefined); } const backendId = await resolveBackendProductId(id); await http<void>(`/admin/products/${backendId}`, { method: "DELETE" }); clearProductsCache(); }
export async function getCategories(): Promise<typeof mockCategories> { if (IS_MOCK_MODE) return delay(mockCategories); const products = await getProducts(); const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))); return [{ id: "all", name: "All Products", icon: "\uD83C\uDF10" }, ...categories.map((name) => ({ id: name, name, icon: "\u2728" }))]; }

export async function getOrders(): Promise<Order[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.orders, mockOrders)); const data = await http<{ orders: BackendOrder[] }>("/admin/orders"); return data.orders.map(orderToFrontend); }
export type DeliveredProductMatch = { orderId: string; productTitle: string; deliveryEmail: string; deliveredAt: string; customerEmail: string; resellerOrder: boolean };
export async function searchDeliveredProduct(email: string): Promise<{ email: string; sold: boolean; matches: DeliveredProductMatch[] }> {
  if (IS_MOCK_MODE) return delay({ email: email.trim().toLowerCase(), sold: false, matches: [] });
  return http(`/admin/orders/delivered-product-search?email=${encodeURIComponent(email.trim())}`);
}
export type CancellationPreview = {
  order: Order & { assignedDelivery?: boolean };
  eligible: boolean;
  resellerAdjustment: null | { currency: CurrencyCode; reversalAmount: number; currentDue: number; dueAfterCancellation: number; invoiceStatus: string };
};
export async function getOrderCancellationPreview(orderId: string): Promise<CancellationPreview> {
  const data = await http<{ order: BackendOrder & { id?: string; productName?: string; customerName?: string; customerEmail?: string; assignedDelivery?: boolean }; eligible: boolean; resellerAdjustment: CancellationPreview["resellerAdjustment"] }>(`/admin/orders/${encodeURIComponent(orderId.trim())}/cancellation-preview`);
  return {
    order: {
      ...orderToFrontend({ ...data.order, orderId: data.order.orderId || data.order.id || orderId }),
      productName: data.order.productName || data.order.productSnapshot?.title || "Product",
      customerName: data.order.customerName || data.order.customer?.name || "",
      customerEmail: data.order.customerEmail || data.order.customer?.email || "",
      assignedDelivery: Boolean(data.order.assignedDelivery),
    },
    eligible: data.eligible,
    resellerAdjustment: data.resellerAdjustment,
  };
}
export async function cancelOrder(orderId: string, reason: string): Promise<{ order: Order; alreadyCancelled: boolean; dueAdjustment: { reversed: boolean; amount: number; currency: CurrencyCode; remainingDue: number | null } }> {
  const data = await http<{ order: BackendOrder; alreadyCancelled: boolean; dueAdjustment: { reversed: boolean; amount: number; currency: CurrencyCode; remainingDue: number | null } }>(`/admin/orders/${encodeURIComponent(orderId.trim())}/cancel`, { method: "POST", body: JSON.stringify({ reason }) });
  return { ...data, order: orderToFrontend(data.order) };
}
export async function searchAdminOrders(query: string, status?: Order["status"] | "all"): Promise<Order[]> {
  if (IS_MOCK_MODE) {
    const q = query.trim().toLowerCase();
    const all = await getOrders();
    return all.filter((o) => (!status || status === "all" || o.status === status) && (!q || [o.id, o.transactionId, o.customerOrderRef || "", o.customerName, o.customerEmail, o.contact, o.productName, o.paymentMethod, o.approvedByNickname || "", o.deliveredByNickname || ""].some((v) => String(v).toLowerCase().includes(q))));
  }
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (status && status !== "all") params.set("status", status);
  const data = await http<{ orders: BackendOrder[] }>(`/admin/orders/search?${params.toString()}`);
  return data.orders.map(orderToFrontend);
}
export async function getOrderById(id: string): Promise<Order | null> { if (IS_MOCK_MODE) { const list = await getOrders(); return list.find((o) => o.id === id) ?? null; } const token = getOrderToken(id); if (!token) return null; try { const data = await http<{ order: BackendOrder }>(`/orders/${id}/status?token=${encodeURIComponent(token)}`); return orderToFrontend(data.order); } catch { return null; } }
export async function createOrder(o: Omit<Order, "id" | "status" | "createdAt"> & { promoCode?: string }): Promise<Order> {
  if (IS_MOCK_MODE) { const list = await getOrders(); const order: Order = { ...o, id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`, status: "pending", createdAt: new Date().toISOString() }; save(STORAGE_KEYS.orders, [order, ...list]); return delay(order); }
  const productBackendId = await resolveBackendProductId(o.productId); const isResellerOrder = o.paymentMethod === "reseller_due"; const paymentNote = isResellerOrder ? "Reseller due order" : `Channel: ${o.paymentChannel}${o.customerOrderRef ? `; Reference: ${o.customerOrderRef}` : ""}`;
  const requestedRegion = o.priceRegion || (isResellerOrder ? "bd" : priceRegionForPaymentMethod(o.paymentMethod));
  const data = await http<{ order: { orderId: string; status: Order["status"]; productTitle: string; amount: number; currency: CurrencyCode; priceRegion: PriceRegion; paymentMethod: Order["paymentMethod"]; transactionId?: string; customerOrderRef?: string }; accessToken: string }>("/orders", { method: "POST", body: JSON.stringify({ productId: productBackendId, customer: { name: o.customerName, email: o.customerEmail, whatsapp: o.contact || "" }, paymentMethod: o.paymentMethod, priceRegion: requestedRegion, transactionId: isResellerOrder ? "" : o.transactionId, customerOrderRef: o.customerOrderRef || "", paymentNote, promoCode: o.promoCode || "" }) });
  saveOrderToken(data.order.orderId, data.accessToken);
  return { ...o, id: data.order.orderId, productName: data.order.productTitle || o.productName, amount: money(data.order.amount || o.amount), currency: data.order.currency, priceRegion: data.order.priceRegion, status: data.order.status, createdAt: new Date().toISOString() };
}

export type CheckoutBatchItem = { productId: string; backendId?: string; productName: string; quantity: number; productLogoUrl?: string; productIcon?: string };
export type CreateOrderBatchInput = {
  items: CheckoutBatchItem[]; customerName: string; customerEmail: string; contact?: string;
  paymentMethod: Order['paymentMethod']; paymentChannel: string; transactionId: string; customerOrderRef?: string;
  priceRegion?: PriceRegion; promoCode?: string; clientRequestId?: string;
  // Required only for products that use the manual activation flow.
  // The API encrypts this value and never returns it to public pages.
  manualActivation?: { email: string; password: string };
};
export type CreatedOrderBatch = { batchId: string; orders: Order[]; totalAmount: number; currency: CurrencyCode };

export async function createOrderBatch(input: CreateOrderBatchInput): Promise<CreatedOrderBatch> {
  if (IS_MOCK_MODE) {
    const orders: Order[] = [];
    for (const item of input.items) for (let index = 0; index < item.quantity; index += 1) {
      orders.push(await createOrder({ productId: item.productId, productName: item.productName, productLogoUrl: item.productLogoUrl, productIcon: item.productIcon, customerName: input.customerName, customerEmail: input.customerEmail, contact: input.contact || '', amount: 0, currency: 'BDT', priceRegion: input.priceRegion, paymentMethod: input.paymentMethod, paymentChannel: input.paymentChannel, transactionId: input.transactionId, customerOrderRef: input.customerOrderRef, promoCode: input.promoCode }));
    }
    return { batchId: `BATCH-${Date.now()}`, orders, totalAmount: orders.reduce((sum, order) => sum + order.amount, 0), currency: orders[0]?.currency || 'BDT' };
  }
  const isResellerOrder = input.paymentMethod === 'reseller_due';
  const requestedRegion = input.priceRegion || (isResellerOrder ? 'bd' : priceRegionForPaymentMethod(input.paymentMethod));
  // Products already loaded by checkout include the database ID. Reusing it
  // avoids a second public product request before the order can be created.
  const resolvedItems = await Promise.all(input.items.map(async (item) => ({ productId: item.backendId || await resolveBackendProductId(item.productId), quantity: item.quantity })));
  const paymentNote = isResellerOrder ? 'Reseller due order' : `Channel: ${input.paymentChannel}${input.customerOrderRef ? `; Reference: ${input.customerOrderRef}` : ''}`;
  const payload = JSON.stringify({ items: resolvedItems, customer: { name: input.customerName, email: input.customerEmail, whatsapp: input.contact || '' }, paymentMethod: input.paymentMethod, priceRegion: requestedRegion, transactionId: isResellerOrder ? '' : input.transactionId, customerOrderRef: input.customerOrderRef || '', paymentNote, promoCode: input.promoCode || '', manualActivation: input.manualActivation, clientRequestId: input.clientRequestId || '' });
  type BatchResponse = { batchId: string; totalAmount: number; currency: CurrencyCode; orders: Array<{ orderId: string; productTitle: string; amount: number; currency: CurrencyCode; status: Order['status']; accessToken: string }> };
  let data: BatchResponse | null = null;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3 && !data; attempt += 1) {
    try {
      data = await http<BatchResponse>('/orders/batch', { method: 'POST', body: payload, timeoutMs: 120_000 });
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : '';
      const recoverable = /already being submitted|too long to respond/i.test(message);
      if (!recoverable || attempt === 2) throw error;
      await delay(undefined, 1800 + attempt * 1200);
    }
  }
  if (!data) throw lastError instanceof Error ? lastError : new Error('Could not confirm this order. Please check your account history.');
  const orders = data.orders.map((order) => {
    saveOrderToken(order.orderId, order.accessToken);
    const source = input.items.find((item) => item.productName === order.productTitle);
    return { id: order.orderId, productId: source?.productId || '', productName: order.productTitle, productLogoUrl: source?.productLogoUrl, productIcon: source?.productIcon, batchId: data.batchId, customerName: input.customerName, customerEmail: input.customerEmail, contact: input.contact || '', amount: money(order.amount), currency: order.currency, priceRegion: requestedRegion, paymentMethod: input.paymentMethod, paymentChannel: input.paymentChannel, transactionId: input.transactionId, customerOrderRef: input.customerOrderRef, status: order.status, createdAt: new Date().toISOString() };
  });
  return { batchId: data.batchId, orders, totalAmount: money(data.totalAmount), currency: data.currency };
}
function allocateMockDelivery(order: Order) {
  const deliveries = load<Record<string, DeliveryPayload>>(STORAGE_KEYS.deliveries, {});
  if (deliveries[order.id]) return deliveries[order.id];
  const stock = load<StockItem[]>(STORAGE_KEYS.stock, mockStock);
  const item = stock.find((s) => s.status === "available" && (s.productId === order.productId || s.productId === order.productName));
  if (!item) return null;
  const delivery = stockToDelivery(item);
  deliveries[order.id] = delivery;
  save(STORAGE_KEYS.deliveries, deliveries);
  save(STORAGE_KEYS.stock, stock.map((s) => (s.id === item.id ? { ...s, status: "delivered" } : s)));
  return delivery;
}
export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> { if (IS_MOCK_MODE) { const list = await getOrders(); const next = list.map((o) => (o.id === id ? { ...o, status } : o)); const updated = next.find((o) => o.id === id) ?? null; if (updated && (status === "approved" || status === "delivered")) allocateMockDelivery(updated); save(STORAGE_KEYS.orders, next); return delay(updated); } if (status === "approved") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/approve`, { method: "POST" }); return orderToFrontend(data.order); }
  if (status === "delivered") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/mark-delivered`, { method: "POST" }); return orderToFrontend(data.order); } if (status === "rejected") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: "Rejected by admin" }) }); return orderToFrontend(data.order); } throw new Error("Restoring pending orders is not supported in live mode."); }
export async function getOrderDelivery(orderId: string): Promise<DeliveryPayload | null> { if (IS_MOCK_MODE) return delay(load<Record<string, DeliveryPayload>>(STORAGE_KEYS.deliveries, {})[orderId] || null); const token = getOrderToken(orderId); if (!token) return null; try { const data = await http<{ delivery: DeliveryPayload }>(`/orders/${orderId}/delivery?token=${encodeURIComponent(token)}`); return data.delivery; } catch { return null; } }
export async function getCustomerOrders(): Promise<Order[]> {
  if (IS_MOCK_MODE) {
    const customer = getCurrentCustomer();
    const orders = await getOrders();
    return customer ? orders.filter((o) => o.customerEmail.toLowerCase() === customer.email.toLowerCase()) : [];
  }
  const data = await http<{ orders: any[] }>("/customer/orders");
  return (data.orders || []).map(trackPayloadToOrder);
}
export async function getResellerOrdersByDeliveryEmail(email: string): Promise<Order[]> {
  const query = email.trim().toLowerCase();
  if (IS_MOCK_MODE) {
    const orders = await getCustomerOrders();
    return orders
      .filter((order) => order.paymentMethod === "reseller_due" && (!query || String(order.deliveryEmail || "").toLowerCase().includes(query)))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100);
  }
  const data = await http<{ orders: any[] }>(`/reseller/orders?email=${encodeURIComponent(query)}`);
  return (data.orders || []).map(trackPayloadToOrder);
}
export async function getCustomerOrderDelivery(orderId: string): Promise<DeliveryPayload | null> {
  if (IS_MOCK_MODE) return getOrderDelivery(orderId);
  try {
    const data = await http<{ delivery: DeliveryPayload }>(`/customer/orders/${orderId}/delivery`);
    return data.delivery;
  } catch {
    return null;
  }
}
export async function addOrderDeliveryDetails(orderId: string, input: { type: DeliveryMode; email?: string; password?: string; activationCode?: string; instruction?: string; videoUrl?: string; imageUrl?: string; getCodeAccessDays?: number; adminNote?: string }): Promise<Order> {
  const data = await http<{ order: BackendOrder }>(`/admin/orders/${encodeURIComponent(orderId)}/delivery-details`, { method: "POST", body: JSON.stringify({ type: input.type, payload: { deliveryMode: input.type, email: input.email || "", password: input.password || "", activationCode: input.activationCode || "", instruction: input.instruction || "", videoUrl: input.videoUrl || "", imageUrl: input.imageUrl || "", getCodeAccessDays: input.getCodeAccessDays || 25 }, adminNote: input.adminNote || input.instruction || "" }) });
  return orderToFrontend(data.order);
}
export type ManualActivationState = { orderId: string; submitted: boolean; activated: boolean; submittedAt?: string | null; activatedAt?: string | null; activatedByNickname?: string; details?: { email: string; password: string } | null };
export async function submitManualActivation(orderId: string, email: string, password: string): Promise<ManualActivationState> {
  return http<ManualActivationState>(`/customer/orders/${orderId}/manual-activation`, { method: "POST", body: JSON.stringify({ email, password }) });
}
export async function getAdminManualActivation(orderId: string): Promise<ManualActivationState> {
  return http<ManualActivationState>(`/admin/orders/${orderId}/manual-activation`);
}
export async function completeAdminManualActivation(orderId: string): Promise<ManualActivationState> {
  return http<ManualActivationState>(`/admin/orders/${orderId}/manual-activation/complete`, { method: "POST" });
}
export type TrackOrderResult = { order: Order; delivery?: DeliveryPayload | null };
function trackPayloadToOrder(x: any): Order {
  return {
    id: x.orderId,
    productId: "",
    productName: x.productTitle || x.product?.title || "Product",
    productLogoUrl: x.productLogoUrl || x.product?.logoUrl || "",
    productIcon: x.productIcon || x.product?.icon || "✨",
    batchId: x.batchId || "",
    customerName: x.customer?.name || "",
    customerEmail: x.customer?.email || "",
    contact: x.customer?.whatsapp || "",
    amount: money(x.amount || x.product?.price || 0),
    currency: x.currency || x.product?.currency,
    priceRegion: x.priceRegion || x.product?.priceRegion,
    paymentMethod: x.paymentMethod,
    paymentChannel: x.paymentMethod,
    transactionId: x.transactionId || "",
    customerOrderRef: x.customerOrderRef || "",
    status: x.status,
    createdAt: x.createdAt || new Date().toISOString(),
    approvedByNickname: x.approvedByNickname || "",
    deliveredByNickname: x.deliveredByNickname || "",
    rejectedByNickname: x.rejectedByNickname || "",
    cancelledByNickname: x.cancelledByNickname || "",
    cancelledAt: x.cancelledAt || "",
    cancelReason: x.cancelReason || "",
    reviewedByNickname: x.reviewedByNickname || "", deliveryMode: x.deliveryMode || x.product?.deliveryMode || "", deliveryVideoUrl: x.product?.deliveryVideoUrl || "", manualInputMode: x.manualInputMode || x.product?.manualInputMode || "ideogram_credentials", manualActivationRequired: Boolean(x.manualActivationRequired), manualActivationSubmitted: Boolean(x.manualActivationSubmitted), manualActivationActivated: Boolean(x.manualActivationActivated), deliveryEmail: x.deliveryEmail || "",
  };
}
export async function trackOrdersByCode(code: string): Promise<TrackOrderResult[]> {
  if (IS_MOCK_MODE) {
    const q = code.trim().toLowerCase();
    const list = (await getOrders()).filter((o) => [o.id, o.transactionId, o.customerOrderRef || ""].some((v) => String(v).toLowerCase() === q));
    const deliveries = load<Record<string, DeliveryPayload>>(STORAGE_KEYS.deliveries, {});
    return list.map((order) => ({ order, delivery: deliveries[order.id] || null }));
  }
  const data = await http<{ orders: any[] }>("/track-orders", { method: "POST", body: JSON.stringify({ code }) });
  return (data.orders || []).map((x) => ({ order: trackPayloadToOrder(x), delivery: x.delivery || null }));
}

export async function getStock(): Promise<StockItem[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.stock, mockStock)); const data = await http<{ stock: BackendStock[] }>("/admin/stock"); return data.stock.map(stockToFrontend); }
export async function createStock(s: Omit<StockItem, "id" | "createdAt">): Promise<StockItem> { if (IS_MOCK_MODE) { const list = await getStock(); const item: StockItem = { ...s, id: `STK-${Math.floor(100 + Math.random() * 900)}`, createdAt: new Date().toISOString() }; save(STORAGE_KEYS.stock, [item, ...list]); return delay(item); } const productId = await resolveBackendProductId(s.productId); const deliveryMode = s.deliveryMode || "credentials"; const data = await http<{ stock: BackendStock }>("/admin/stock", { method: "POST", body: JSON.stringify({ productId, type: deliveryMode, payload: { deliveryMode, email: s.email, password: s.password, activationCode: s.activationCode || "", instruction: s.instructions, videoUrl: s.videoUrl || "", imageUrl: s.imageUrl || "", getCodeAccessDays: s.getCodeAccessDays || 25 }, adminNote: s.instructions || "" }) }); clearProductsCache(); return stockToFrontend(data.stock); }
export async function deleteStock(id: string): Promise<void> { if (IS_MOCK_MODE) { const list = await getStock(); save(STORAGE_KEYS.stock, list.filter((s) => s.id !== id)); return delay(undefined); } await http<void>(`/admin/stock/${id}/disable`, { method: "PATCH", body: JSON.stringify({ enable: false }) }); clearProductsCache(); }

export async function getMailTxtFiles(): Promise<MailTxtFile[]> {
  if (IS_MOCK_MODE) return delay(load<MailTxtFile[]>(STORAGE_KEYS.mailTxtFiles, []));
  const data = await http<{ files: BackendMailTxtFile[] }>("/admin/mail-txt-files");
  return (data.files || []).map(mailTxtFileFromBackend);
}

export async function uploadMailTxtFile(input: { name: string; text: string }): Promise<MailTxtFile> {
  const accounts = parseMailTxtAccounts(input.text);
  if (!accounts.length) throw new Error("No valid mail accounts found. Use: email | password | refresh_token | client_id");
  if (IS_MOCK_MODE) {
    const files = load<MailTxtFile[]>(STORAGE_KEYS.mailTxtFiles, []);
    const file: MailTxtFile = { id: `MAIL-${Date.now()}`, name: input.name, accountCount: accounts.length, dateAdded: Date.now(), accounts };
    save(STORAGE_KEYS.mailTxtFiles, [file, ...files]);
    return delay(file);
  }
  const data = await http<{ file: BackendMailTxtFile }>("/admin/mail-txt-files", { method: "POST", body: JSON.stringify({ name: input.name, accounts }) });
  return mailTxtFileFromBackend(data.file);
}

export async function deleteMailTxtFile(id: string): Promise<void> {
  if (IS_MOCK_MODE) { save(STORAGE_KEYS.mailTxtFiles, load<MailTxtFile[]>(STORAGE_KEYS.mailTxtFiles, []).filter((f) => f.id !== id)); return delay(undefined); }
  await http<void>(`/admin/mail-txt-files/${id}`, { method: "DELETE" });
}

export async function fetchLatestLoginCode(orderId: string): Promise<LoginCodeResult> {
  if (IS_MOCK_MODE) {
    return delay({ code: String(Math.floor(100000 + Math.random() * 900000)), subject: "Mock login code", receivedAt: new Date().toISOString(), preview: "Use this code to finish sign in." }, 700);
  }
  const token = getOrderToken(orderId);
  if (!token) throw new Error("Secure order token missing. Open this from your original order page or track with your order code.");
  return http<LoginCodeResult>(`/orders/${orderId}/login-code?token=${encodeURIComponent(token)}`, { method: "POST" });
}
export async function fetchCustomerLatestLoginCode(orderId: string): Promise<LoginCodeResult> {
  if (IS_MOCK_MODE) {
    return delay({ code: String(Math.floor(100000 + Math.random() * 900000)), subject: "Mock login code", receivedAt: new Date().toISOString(), preview: "Use this code to finish sign in." }, 700);
  }
  return http<LoginCodeResult>(`/customer/orders/${orderId}/login-code`, { method: "POST" });
}

export async function getPaymentSettings(): Promise<PaymentSettings> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.payment, mockPaymentSettings)); const data = await http<{ methods: BackendPaymentMethod[] }>("/payment-methods"); if (!data.methods.length) return mockPaymentSettings; return paymentToFrontend(data.methods); }
export async function getAdminPaymentSettings(): Promise<PaymentSettings> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.payment, mockPaymentSettings)); const data = await http<{ methods: BackendPaymentMethod[] }>("/admin/payment-methods"); if (!data.methods.length) return mockPaymentSettings; return paymentToFrontend(data.methods); }
export async function updatePaymentSettings(s: PaymentSettings): Promise<PaymentSettings> { if (IS_MOCK_MODE) { save(STORAGE_KEYS.payment, s); return delay(s); } const method: BackendPaymentMethod = { key: "pakistan", title: "Pakistan", instructions: s.pakistan.instructions, accounts: [{ label: "Easypaisa", value: s.pakistan.easypaisa }, { label: "JazzCash", value: s.pakistan.jazzcash }, { label: "Bank", value: s.pakistan.bank }], isActive: true }; await http(`/admin/payment-methods/pakistan`, { method: "PUT", body: JSON.stringify(method) }); return getAdminPaymentSettings(); }

export async function adminLogin(email: string, password: string): Promise<boolean> { if (IS_MOCK_MODE) { const ok = email.trim().length > 0 && password.length > 0; if (ok && isBrowser) window.localStorage.setItem(STORAGE_KEYS.admin, "1"); return delay(ok, 400); } try { const res = await http<{ token: string; admin: AdminUser }>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); if (res?.token && isBrowser) { window.localStorage.setItem(STORAGE_KEYS.token, res.token); window.localStorage.setItem(STORAGE_KEYS.admin, "1"); save(STORAGE_KEYS.adminInfo, res.admin); return true; } return false; } catch { return false; } }
export function getCurrentAdmin(): AdminUser | null { return load<AdminUser | null>(STORAGE_KEYS.adminInfo, null); }
export function isOwner(): boolean { return getCurrentAdmin()?.role === "owner"; }
export function isAdminAuthed(): boolean { if (!isBrowser) return false; if (IS_MOCK_MODE) return window.localStorage.getItem(STORAGE_KEYS.admin) === "1"; return window.localStorage.getItem(STORAGE_KEYS.admin) === "1" && !!window.localStorage.getItem(STORAGE_KEYS.token); }
export function adminLogout() { if (!isBrowser) return; window.localStorage.removeItem(STORAGE_KEYS.admin); window.localStorage.removeItem(STORAGE_KEYS.token); window.localStorage.removeItem(STORAGE_KEYS.adminInfo); }

export async function getAdminUsers(): Promise<AdminUser[]> { const data = await http<{ admins: AdminUser[] }>("/admin/users"); return data.admins; }
export async function createAdminUser(input: { email: string; password: string; nickname: string; name?: string; role?: "admin" | "owner" }): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>("/admin/users", { method: "POST", body: JSON.stringify(input) }); return data.admin; }
export async function resetAdminPassword(id: string, password: string): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }); return data.admin; }
export async function changeOwnPassword(password: string): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>("/admin/users/me/password", { method: "PATCH", body: JSON.stringify({ password }) }); return data.admin; }
export async function setAdminStatus(id: string, isActive: boolean): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }); return data.admin; }
export async function clearAdminDue(id: string): Promise<{ settlementId: string; orderCount: number; totalSalesPKR: number; duePKR: number; profitPKR: number }> { return http(`/admin/users/${id}/due/clear`, { method: "POST" }); }
export type DashboardPeriodMode = "weekly" | "monthly" | "lifetime" | "custom";
export type DashboardQuery = { mode?: DashboardPeriodMode; start?: string; end?: string; month?: number; year?: number; compare?: boolean };
export type DashboardResponse = {
  mode?: "staff";
  staffSummary?: { currency: "PKR"; totalSalesPKR: number; duePKR: number; profitPKR: number; orderCount: number; recentSales: Array<{ id: string; productName: string; customerName: string; customerEmail: string; status: string; approvedAt: string; sellingPrice: number; buyingPrice: number; profit: number }> };
  period?: { mode: DashboardPeriodMode; start: string | null; end: string | null; previousStart?: string | null; previousEnd?: string | null };
  stats: DashboardStats;
  kpis?: DashboardKpi[];
  chart?: DashboardChartRow[];
  orderStatus?: DashboardStatusRow[];
  salesByProduct: ProductSalesRow[];
  productPerformance?: ProductPerformanceRow[];
  topCustomers?: TopCustomerRow[];
  attention?: AttentionItem[];
  recentOrders: BackendOrder[];
  recentActivity: ActivityLog[];
  lowStock: { productId: string; productName: string; available: number }[];
  outOfStock?: { productId: string; productName: string; available: number }[];
};

export type AdminCustomerSearchResult = {
  id: string;
  key: string;
  name: string;
  email: string;
  whatsapp: string;
  picture?: string;
  orderCount: number;
  lastOrderAt?: string | null;
  joinedAt?: string | null;
  lastLoginAt?: string | null;
};

export type CustomerProfile = {
  customer: AdminCustomerSearchResult;
  summary: { totalOrders: number; pendingOrders: number; approvedOrders: number; deliveredOrders: number; rejectedOrders: number; cancelledOrders: number };
  orders: Array<{ id: string; productName: string; amount: number; currency: CurrencyCode; status: Order["status"]; paymentMethod: Order["paymentMethod"]; transactionId: string; customerOrderRef: string; createdAt: string; reviewedAt?: string | null; approvedAt?: string | null; deliveredAt?: string | null; rejectedAt?: string | null; approvedByNickname?: string; deliveredByNickname?: string; rejectedByNickname?: string; rejectReason?: string }>;
  history: Array<{ type: string; at: string; title: string; detail: string }>;
};
export async function getDashboard(query: DashboardQuery = {}): Promise<DashboardResponse> {
  const params = new URLSearchParams();
  if (query.mode) params.set("mode", query.mode);
  if (query.start) params.set("start", query.start);
  if (query.end) params.set("end", query.end);
  if (query.month) params.set("month", String(query.month));
  if (query.year) params.set("year", String(query.year));
  if (query.compare) params.set("compare", "true");
  const path = `/admin/dashboard${params.toString() ? `?${params}` : ""}`;
  return http(path);
}
export async function fetchAdminLoginCode(email: string): Promise<LoginCodeResult & { fileName?: string }> {
  return http<LoginCodeResult & { fileName?: string }>("/admin/mail-txt/login-code", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
}

export async function getResellerProfile(): Promise<ResellerProfile | null> {
  if (IS_MOCK_MODE || !getCustomerToken()) return null;
  try {
    const data = await http<{ reseller: ResellerProfile }>("/reseller/me");
    return data.reseller;
  } catch { return null; }
}

export async function getResellerStatement(start?: string, end?: string): Promise<{ entries: ResellerLedgerEntry[]; balances: Record<string, number> }> {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  return http(`/reseller/statement${params.size ? `?${params}` : ""}`);
}

export async function getResellerPaymentRequests(): Promise<ResellerPaymentRequest[]> {
  if (IS_MOCK_MODE || !getCustomerToken()) return [];
  const data = await http<{ requests: ResellerPaymentRequest[] }>("/reseller/payment-requests");
  return data.requests || [];
}

export async function submitResellerPaymentRequest(input: { amount: number; channel: "bkash" | "nagad"; transactionId: string; note?: string }): Promise<ResellerPaymentRequest> {
  const data = await http<{ request: ResellerPaymentRequest }>("/reseller/payment-requests", { method: "POST", body: JSON.stringify(input) });
  return data.request;
}

export async function searchCustomers(query: string): Promise<AdminCustomerSearchResult[]> {
  if (!query.trim()) return [];
  const data = await http<{ customers: AdminCustomerSearchResult[] }>(`/admin/customers/search?q=${encodeURIComponent(query.trim())}`);
  return data.customers || [];
}

export async function getAdminCustomerList(query = ""): Promise<AdminUserProfile[]> {
  const data = await http<{ users: AdminUserProfile[] }>(`/admin/customers${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  return data.users || [];
}

export async function getResellers(query = ""): Promise<AdminReseller[]> {
  const data = await http<{ resellers: AdminReseller[] }>(`/admin/resellers${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`);
  return data.resellers || [];
}

export async function getResellerOverview(): Promise<{ summary: { total: number; active: number; invited: number; suspended: number; totalDueBDT: number; creditAtRisk: number }; resellers: AdminReseller[] }> {
  return http("/admin/resellers/overview");
}

export async function createReseller(input: { email: string; name?: string; creditLimitBDT?: number; internalNote?: string }): Promise<AdminReseller> {
  const data = await http<{ reseller: AdminReseller }>("/admin/resellers", { method: "POST", body: JSON.stringify(input) });
  return data.reseller;
}

export async function getReseller(id: string): Promise<{ reseller: AdminReseller; products: ResellerProductConfig[]; statement: ResellerLedgerEntry[]; invoices: ResellerInvoice[]; paymentRequests: ResellerPaymentRequest[]; balances: Record<string, number> }> {
  return http(`/admin/resellers/${encodeURIComponent(id)}`);
}

export async function approveResellerPaymentRequest(id: string): Promise<{ request: ResellerPaymentRequest; balances: Record<string, number> }> {
  return http(`/admin/reseller-payment-requests/${encodeURIComponent(id)}/approve`, { method: "POST" });
}

export async function rejectResellerPaymentRequest(id: string, reason = ""): Promise<{ request: ResellerPaymentRequest }> {
  return http(`/admin/reseller-payment-requests/${encodeURIComponent(id)}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
}

export async function updateReseller(id: string, input: Partial<Pick<AdminReseller, "name" | "status" | "creditLimitBDT" | "internalNote">>): Promise<AdminReseller> {
  const data = await http<{ reseller: AdminReseller }>(`/admin/resellers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(input) });
  return data.reseller;
}

export async function updateResellerProductAccess(id: string, productId: string, input: { isVisible: boolean; priceBDT?: number | null; pricePKR?: number | null; priceUSDT?: number | null; priceUSD?: number | null; note?: string }): Promise<void> {
  await http(`/admin/resellers/${encodeURIComponent(id)}/products/${encodeURIComponent(productId)}`, { method: "PUT", body: JSON.stringify(input) });
  clearProductsCache();
}

export async function recordResellerPayment(id: string, input: { amount: number; currency: CurrencyCode; discount?: number; paymentReference?: string; note?: string }): Promise<{ receiptNo: string; balances: Record<string, number> }> {
  return http(`/admin/resellers/${encodeURIComponent(id)}/payments`, { method: "POST", body: JSON.stringify(input) });
}

export async function getCustomerProfile(customerKey: string): Promise<CustomerProfile> {
  return http<CustomerProfile>(`/admin/customers/${encodeURIComponent(customerKey)}`);
}

export async function revealCustomerDelivery(orderId: string): Promise<{ delivery: { orderId: string; deliveryMode: DeliveryMode; email: string; password: string; activationCode: string; instruction: string; videoUrl: string; imageUrl: string } }> {
  return http(`/admin/customers/orders/${encodeURIComponent(orderId)}/delivery`);
}


/* ============================ PROMO CODES ============================ */
export async function validatePromoCode(code: string, productId: string, priceRegion: PriceRegion): Promise<AppliedPromo> {
  if (IS_MOCK_MODE) {
    const promos = load<PromoCode[]>("mp_promo_codes", mockPromoCodes);
    const promo = promos.find((p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.isActive);
    if (!promo) throw new Error("This promo code is not valid.");
    return delay({ code: promo.code, description: promo.description, discountType: promo.discountType, percentOff: promo.percentOff, discount: 0, originalAmount: 0, finalAmount: 0 });
  }
  const backendId = await resolveBackendProductId(productId);
  return http<AppliedPromo & { valid: boolean }>("/promo/validate", { method: "POST", body: JSON.stringify({ code: code.trim(), productId: backendId, priceRegion }) });
}

type BackendPromo = Omit<PromoCode, "id"> & { _id: string };
const promoFromBackend = (p: BackendPromo): PromoCode => ({ ...p, id: p._id, productIds: (p.productIds || []).map(String) });

export async function getPromoCodes(): Promise<PromoCode[]> {
  if (IS_MOCK_MODE) return delay(load<PromoCode[]>("mp_promo_codes", mockPromoCodes));
  const data = await http<{ promos: BackendPromo[] }>("/admin/promo-codes");
  return data.promos.map(promoFromBackend);
}

export type HomepagePromo = { code: string; discountType: "percent" | "fixed"; percentOff: number; fixedBDT: number; fixedPKR: number; fixedUSDT: number; productIds: string[] };
export async function getHomepagePromos(): Promise<HomepagePromo[]> {
  if (IS_MOCK_MODE) return delay([]);
  const data = await http<{ promos: HomepagePromo[] }>("/promo/homepage");
  return data.promos || [];
}

export type PromoInput = Omit<PromoCode, "id" | "usedCount" | "createdByNickname" | "createdAt">;

export async function createPromoCode(input: PromoInput): Promise<PromoCode> {
  if (IS_MOCK_MODE) { const list = load<PromoCode[]>("mp_promo_codes", mockPromoCodes); const promo: PromoCode = { ...input, id: `PR-${Date.now()}`, usedCount: 0, createdAt: new Date().toISOString() }; save("mp_promo_codes", [promo, ...list]); return delay(promo); }
  const data = await http<{ promo: BackendPromo }>("/admin/promo-codes", { method: "POST", body: JSON.stringify(input) });
  return promoFromBackend(data.promo);
}

export async function updatePromoCode(id: string, input: PromoInput): Promise<PromoCode> {
  if (IS_MOCK_MODE) { const list = load<PromoCode[]>("mp_promo_codes", mockPromoCodes).map((p) => (p.id === id ? { ...p, ...input } : p)); save("mp_promo_codes", list); return delay(list.find((p) => p.id === id)!); }
  const data = await http<{ promo: BackendPromo }>(`/admin/promo-codes/${id}`, { method: "PUT", body: JSON.stringify(input) });
  return promoFromBackend(data.promo);
}

export async function setPromoCodeStatus(id: string, isActive: boolean): Promise<PromoCode> {
  if (IS_MOCK_MODE) { const list = load<PromoCode[]>("mp_promo_codes", mockPromoCodes).map((p) => (p.id === id ? { ...p, isActive } : p)); save("mp_promo_codes", list); return delay(list.find((p) => p.id === id)!); }
  const data = await http<{ promo: BackendPromo }>(`/admin/promo-codes/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
  return promoFromBackend(data.promo);
}

export async function deletePromoCode(id: string): Promise<void> {
  if (IS_MOCK_MODE) { save("mp_promo_codes", load<PromoCode[]>("mp_promo_codes", mockPromoCodes).filter((p) => p.id !== id)); return delay(undefined); }
  await http(`/admin/promo-codes/${id}`, { method: "DELETE" });
}
