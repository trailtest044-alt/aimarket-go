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
  type PaymentSettings,
  type PriceRegion,
  type CurrencyCode,
  type AdminUser,
  type DashboardStats,
  type ProductSalesRow,
  type ActivityLog,
} from "./mock-data";

const DEFAULT_API_BASE_URL = "https://aimarket-u138.onrender.com/api";

export const API_BASE_URL: string =
  ((import.meta.env.VITE_API_BASE_URL as string | undefined) || DEFAULT_API_BASE_URL).replace(/\/$/, "");

export const IS_MOCK_MODE = (import.meta.env.VITE_USE_MOCK as string | undefined) === "true";

const STORAGE_KEYS = {
  products: "mp_products",
  orders: "mp_orders",
  stock: "mp_stock",
  payment: "mp_payment_settings",
  admin: "mp_admin_auth",
  token: "mp_admin_token",
  adminInfo: "mp_admin_info",
  orderTokens: "mp_order_tokens",
  region: "mp_price_region",
};

const isBrowser = typeof window !== "undefined";
const objectIdRe = /^[a-f\d]{24}$/i;

function load<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try { const raw = window.localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function save<T>(key: string, value: T) { if (isBrowser) window.localStorage.setItem(key, JSON.stringify(value)); }
function delay<T>(value: T, ms = 200): Promise<T> { return new Promise((res) => setTimeout(() => res(value), ms)); }
function getToken(): string | null { return isBrowser ? window.localStorage.getItem(STORAGE_KEYS.token) : null; }
function getOrderTokens(): Record<string, string> { return load<Record<string, string>>(STORAGE_KEYS.orderTokens, {}); }
function saveOrderToken(orderId: string, token: string) { if (!token) return; const tokens = getOrderTokens(); tokens[orderId] = token; save(STORAGE_KEYS.orderTokens, tokens); }
function getOrderToken(orderId: string): string | null { return getOrderTokens()[orderId] || null; }

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(init.headers as Record<string, string> | undefined) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try { const data = await res.json(); if (data?.message) message = data.message; if (data?.error) message = data.error; } catch {}
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

type BackendProduct = {
  _id: string; title: string; slug: string; description?: string; shortDescription?: string; category?: string; imageUrl?: string;
  badge?: string; icon?: string; priceBDT?: number; pricePKR?: number; priceUSDT?: number; worldwideCurrency?: "USDT" | "USD";
  originalPriceBDT?: number; originalPricePKR?: number; originalPriceUSDT?: number; features?: string[];
  deliveryMethod?: string; terms?: string; isActive?: boolean; sortOrder?: number; availableStock?: number;
  createdByNickname?: string; updatedByNickname?: string; displayPrice?: { amount: number; currency: CurrencyCode; region: PriceRegion };
};

type BackendPaymentMethod = { key: "bangladesh" | "pakistan" | "binance"; title: string; instructions: string; accounts?: { label?: string; value?: string; note?: string }[]; isActive?: boolean; };
type BackendOrder = {
  _id?: string; orderId: string; productId?: string | { _id?: string; title?: string; slug?: string };
  productSnapshot?: { title?: string; price?: number; currency?: CurrencyCode; priceRegion?: PriceRegion };
  product?: { title?: string; price?: number; currency?: CurrencyCode; priceRegion?: PriceRegion };
  customer?: { name?: string; email?: string; whatsapp?: string };
  paymentMethod: "bangladesh" | "pakistan" | "binance"; priceRegion?: PriceRegion; transactionId?: string; paymentNote?: string; customerOrderRef?: string;
  status: Order["status"]; createdAt?: string; reviewedAt?: string; rejectReason?: string | null; deliveryAvailable?: boolean;
  approvedByNickname?: string; deliveredByNickname?: string; rejectedByNickname?: string; reviewedByNickname?: string;
};
type BackendStock = { _id: string; productId?: string | { _id?: string; title?: string; slug?: string }; status: "available" | "reserved" | "delivered" | "disabled"; adminNote?: string; createdAt?: string; payload?: { email?: string; password?: string; instruction?: string; videoUrl?: string; imageUrl?: string }; createdByNickname?: string; };

export type DeliveryPayload = { email?: string; password?: string; instruction?: string; instructions?: string; videoUrl?: string; imageUrl?: string; extra?: Record<string, unknown>; };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || `product-${Date.now()}`; }
function money(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export function formatMoney(amount: number, currency: CurrencyCode = "USDT") {
  if (currency === "BDT") return `৳${Math.round(amount).toLocaleString("en-BD")}`;
  if (currency === "PKR") return `Rs ${Math.round(amount).toLocaleString("en-PK")}`;
  return `${Number(amount).toFixed(2)} ${currency}`;
}
export function priceForRegion(product: Product, region: PriceRegion) {
  if (region === "bd") return { amount: product.priceBDT, currency: "BDT" as CurrencyCode };
  if (region === "pk") return { amount: product.pricePKR, currency: "PKR" as CurrencyCode };
  return { amount: product.priceUSDT, currency: product.worldwideCurrency as CurrencyCode };
}
export function methodForRegion(region: PriceRegion): "bangladesh" | "pakistan" | "binance" { return region === "bd" ? "bangladesh" : region === "pk" ? "pakistan" : "binance"; }
export function allowedPaymentMethods(region: PriceRegion): Array<"bangladesh" | "pakistan" | "binance"> { return region === "bd" ? ["bangladesh"] : ["pakistan", "binance"]; }
export function priceRegionForPaymentMethod(method: "bangladesh" | "pakistan" | "binance"): PriceRegion { if (method === "bangladesh") return "bd"; if (method === "pakistan") return "pk"; return "world"; }

function productToFrontend(p: BackendProduct): Product {
  const priceBDT = money(p.priceBDT);
  const pricePKR = money(p.pricePKR);
  const priceUSDT = money(p.priceUSDT);
  const displayRegion = p.displayPrice?.region || load<PriceRegion>(STORAGE_KEYS.region, "world");
  const display = p.displayPrice || (displayRegion === "bd" ? { amount: priceBDT, currency: "BDT" as CurrencyCode, region: "bd" as PriceRegion } : displayRegion === "pk" ? { amount: pricePKR, currency: "PKR" as CurrencyCode, region: "pk" as PriceRegion } : { amount: priceUSDT, currency: (p.worldwideCurrency || "USDT") as CurrencyCode, region: "world" as PriceRegion });
  return {
    id: p.slug || p._id,
    backendId: p._id,
    name: p.title,
    category: p.category || "AI Tools",
    price: money(display.amount),
    currency: display.currency,
    priceRegion: display.region,
    priceBDT, pricePKR, priceUSDT,
    worldwideCurrency: p.worldwideCurrency || "USDT",
    originalPrice: display.region === "bd" ? money(p.originalPriceBDT) : display.region === "pk" ? money(p.originalPricePKR) : money(p.originalPriceUSDT),
    originalPriceBDT: money(p.originalPriceBDT), originalPricePKR: money(p.originalPricePKR), originalPriceUSDT: money(p.originalPriceUSDT),
    icon: p.icon || "✨",
    logoUrl: p.imageUrl || undefined,
    badge: p.badge || undefined,
    shortDescription: p.shortDescription || p.description || "",
    description: p.description || p.shortDescription || "",
    features: Array.isArray(p.features) ? p.features : [],
    deliveryMethod: p.deliveryMethod || "Account login details will be delivered after admin approval.",
    terms: p.terms || "Do not change password/recovery info unless instructed by admin.",
    stock: money(p.availableStock ?? 0),
    addedBy: p.createdByNickname || "",
    updatedBy: p.updatedByNickname || "",
    sortOrder: Number(p.sortOrder || 0),
  };
}

function productToBackend(p: Product) {
  const slug = /^[a-z0-9-]+$/.test(p.id) ? p.id : slugify(p.name);
  return {
    title: p.name, slug, description: p.description || "", shortDescription: p.shortDescription || "", category: p.category || "AI Tools",
    imageUrl: p.logoUrl || "", badge: p.badge || "", icon: p.icon || "✨",
    priceBDT: money(p.priceBDT), pricePKR: money(p.pricePKR), priceUSDT: money(p.priceUSDT), worldwideCurrency: p.worldwideCurrency || "USDT",
    originalPriceBDT: money(p.originalPriceBDT), originalPricePKR: money(p.originalPricePKR), originalPriceUSDT: money(p.originalPriceUSDT),
    features: p.features || [], deliveryMethod: p.deliveryMethod || "", terms: p.terms || "", isActive: true, sortOrder: Number(p.sortOrder || 0),
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
function orderToFrontend(o: BackendOrder): Order {
  const note = parsePaymentNote(o.paymentNote); const snap = o.productSnapshot || o.product; const productId = typeof o.productId === "object" ? (o.productId.slug || o.productId._id || "") : (o.productId || "");
  return {
    id: o.orderId, productId, productName: snap?.title || (typeof o.productId === "object" ? o.productId.title : "") || "Product",
    customerName: o.customer?.name || "", customerEmail: o.customer?.email || "", contact: o.customer?.whatsapp || "",
    amount: money(snap?.price), currency: snap?.currency, priceRegion: o.priceRegion || snap?.priceRegion,
    paymentMethod: o.paymentMethod, paymentChannel: note.channel, transactionId: o.transactionId || "", customerOrderRef: o.customerOrderRef || note.ref,
    status: o.status, createdAt: o.createdAt || new Date().toISOString(), approvedByNickname: o.approvedByNickname || "", deliveredByNickname: o.deliveredByNickname || "", rejectedByNickname: o.rejectedByNickname || "", reviewedByNickname: o.reviewedByNickname || "",
  };
}
function stockToFrontend(s: BackendStock): StockItem { const productId = typeof s.productId === "object" ? (s.productId.slug || s.productId._id || "") : (s.productId || ""); return { id: s._id, productId, email: s.payload?.email || "Encrypted", password: s.payload?.password ? "••••••••" : "Encrypted", instructions: s.payload?.instruction || s.adminNote || "Encrypted delivery item", videoUrl: s.payload?.videoUrl, imageUrl: s.payload?.imageUrl, status: s.status === "available" ? "available" : "delivered", createdAt: s.createdAt || new Date().toISOString(), addedBy: s.createdByNickname || "" }; }
async function resolveBackendProductId(productIdOrSlug: string): Promise<string> { if (objectIdRe.test(productIdOrSlug)) return productIdOrSlug; const product = await getProductById(productIdOrSlug); return product?.backendId || productIdOrSlug; }

export async function getVisitorRegion(): Promise<{ region: PriceRegion; country?: string }> {
  if (IS_MOCK_MODE) return { region: load<PriceRegion>(STORAGE_KEYS.region, "world") };
  if (isBrowser) {
    const cached = load<{ region: PriceRegion; country?: string; ts?: number } | null>(STORAGE_KEYS.region, null);
    if (cached?.region && cached.ts && Date.now() - cached.ts < 1000 * 60 * 60 * 12) return cached;
  }
  let region: PriceRegion = "world"; let country = "XX";
  try {
    const r = await fetch("https://ipapi.co/json/");
    if (r.ok) { const data = await r.json(); country = String(data.country_code || "XX").toUpperCase(); if (country === "BD") region = "bd"; else if (country === "PK") region = "pk"; }
  } catch {}
  try {
    const data = await http<{ region: PriceRegion; country: string }>(`/region?region=${region}`);
    if (data?.country && data.country !== "XX") { country = data.country; region = data.region; }
  } catch {}
  const result = { region, country, ts: Date.now() };
  save(STORAGE_KEYS.region, result);
  return result;
}

export async function getProducts(): Promise<Product[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.products, mockProducts)); const region = (await getVisitorRegion()).region; const data = await http<{ products: BackendProduct[] }>(`/products?region=${region}`); return data.products.map(productToFrontend).sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name)); }

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
  return data.products.map(productToFrontend).sort((a, b) => (a.sortOrder || 999999) - (b.sortOrder || 999999) || a.name.localeCompare(b.name));
}

export async function getProductById(id: string): Promise<Product | null> { if (IS_MOCK_MODE) { const list = await getProducts(); return list.find((p) => p.id === id || p.backendId === id) ?? null; } try { const region = (await getVisitorRegion()).region; if (objectIdRe.test(id)) { const list = await getProducts(); return list.find((p) => p.backendId === id) ?? null; } const data = await http<{ product: BackendProduct }>(`/products/${id}?region=${region}`); return productToFrontend(data.product); } catch { return null; } }
export async function createProduct(p: Product): Promise<Product> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, [p, ...list]); return delay(p); } const data = await http<{ product: BackendProduct }>("/admin/products", { method: "POST", body: JSON.stringify(productToBackend(p)) }); return productToFrontend(data.product); }
export async function updateProduct(p: Product): Promise<Product> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, list.map((x) => (x.id === p.id ? p : x))); return delay(p); } const backendId = p.backendId || (await resolveBackendProductId(p.id)); const data = await http<{ product: BackendProduct }>(`/admin/products/${backendId}`, { method: "PATCH", body: JSON.stringify(productToBackend(p)) }); return productToFrontend(data.product); }
export async function deleteProduct(id: string): Promise<void> { if (IS_MOCK_MODE) { const list = await getProducts(); save(STORAGE_KEYS.products, list.filter((x) => x.id !== id)); return delay(undefined); } const backendId = await resolveBackendProductId(id); await http<void>(`/admin/products/${backendId}`, { method: "DELETE" }); }
export async function getCategories(): Promise<typeof mockCategories> { if (IS_MOCK_MODE) return delay(mockCategories); const products = await getProducts(); const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))); return [{ id: "all", name: "All Products", icon: "🌐" }, ...categories.map((name) => ({ id: name, name, icon: "✨" }))]; }

export async function getOrders(): Promise<Order[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.orders, mockOrders)); const data = await http<{ orders: BackendOrder[] }>("/admin/orders"); return data.orders.map(orderToFrontend); }
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
export async function createOrder(o: Omit<Order, "id" | "status" | "createdAt">): Promise<Order> {
  if (IS_MOCK_MODE) { const list = await getOrders(); const order: Order = { ...o, id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`, status: "pending", createdAt: new Date().toISOString() }; save(STORAGE_KEYS.orders, [order, ...list]); return delay(order); }
  const productBackendId = await resolveBackendProductId(o.productId); const paymentNote = `Channel: ${o.paymentChannel}${o.customerOrderRef ? `; Reference: ${o.customerOrderRef}` : ""}`;
  const data = await http<{ order: { orderId: string; status: Order["status"]; productTitle: string; amount: number; currency: CurrencyCode; priceRegion: PriceRegion; paymentMethod: Order["paymentMethod"]; transactionId?: string; customerOrderRef?: string }; accessToken: string }>("/orders", { method: "POST", body: JSON.stringify({ productId: productBackendId, customer: { name: o.customerName, email: o.customerEmail, whatsapp: o.contact || "" }, paymentMethod: o.paymentMethod, priceRegion: priceRegionForPaymentMethod(o.paymentMethod), transactionId: o.transactionId, customerOrderRef: o.customerOrderRef || "", paymentNote }) });
  saveOrderToken(data.order.orderId, data.accessToken);
  return { ...o, id: data.order.orderId, productName: data.order.productTitle || o.productName, amount: money(data.order.amount || o.amount), currency: data.order.currency, priceRegion: data.order.priceRegion, status: data.order.status, createdAt: new Date().toISOString() };
}
export async function updateOrderStatus(id: string, status: Order["status"]): Promise<Order | null> { if (IS_MOCK_MODE) { const list = await getOrders(); const next = list.map((o) => (o.id === id ? { ...o, status } : o)); save(STORAGE_KEYS.orders, next); return delay(next.find((o) => o.id === id) ?? null); } if (status === "approved") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/approve`, { method: "POST" }); return orderToFrontend(data.order); }
  if (status === "delivered") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/mark-delivered`, { method: "POST" }); return orderToFrontend(data.order); } if (status === "rejected") { const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/reject`, { method: "POST", body: JSON.stringify({ reason: "Rejected by admin" }) }); return orderToFrontend(data.order); } throw new Error("Restoring pending orders is not supported in live mode."); }
export async function getOrderDelivery(orderId: string): Promise<DeliveryPayload | null> { if (IS_MOCK_MODE) return null; const token = getOrderToken(orderId); if (!token) return null; try { const data = await http<{ delivery: DeliveryPayload }>(`/orders/${orderId}/delivery?token=${encodeURIComponent(token)}`); return data.delivery; } catch { return null; } }
export type TrackOrderResult = { order: Order; delivery?: DeliveryPayload | null };
function trackPayloadToOrder(x: any): Order {
  return {
    id: x.orderId,
    productId: "",
    productName: x.productTitle || x.product?.title || "Product",
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
    reviewedByNickname: x.reviewedByNickname || "",
  };
}
export async function trackOrdersByCode(code: string): Promise<TrackOrderResult[]> {
  if (IS_MOCK_MODE) {
    const q = code.trim().toLowerCase();
    const list = (await getOrders()).filter((o) => [o.id, o.transactionId, o.customerOrderRef || ""].some((v) => String(v).toLowerCase() === q));
    return list.map((order) => ({ order, delivery: null }));
  }
  const data = await http<{ orders: any[] }>("/track-orders", { method: "POST", body: JSON.stringify({ code }) });
  return (data.orders || []).map((x) => ({ order: trackPayloadToOrder(x), delivery: x.delivery || null }));
}

export async function getStock(): Promise<StockItem[]> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.stock, mockStock)); const data = await http<{ stock: BackendStock[] }>("/admin/stock"); return data.stock.map(stockToFrontend); }
export async function createStock(s: Omit<StockItem, "id" | "createdAt">): Promise<StockItem> { if (IS_MOCK_MODE) { const list = await getStock(); const item: StockItem = { ...s, id: `STK-${Math.floor(100 + Math.random() * 900)}`, createdAt: new Date().toISOString() }; save(STORAGE_KEYS.stock, [item, ...list]); return delay(item); } const productId = await resolveBackendProductId(s.productId); const data = await http<{ stock: BackendStock }>("/admin/stock", { method: "POST", body: JSON.stringify({ productId, type: s.email || s.password ? "credentials" : "instruction", payload: { email: s.email, password: s.password, instruction: s.instructions, videoUrl: s.videoUrl || "", imageUrl: s.imageUrl || "" }, adminNote: s.instructions || "" }) }); return stockToFrontend(data.stock); }
export async function deleteStock(id: string): Promise<void> { if (IS_MOCK_MODE) { const list = await getStock(); save(STORAGE_KEYS.stock, list.filter((s) => s.id !== id)); return delay(undefined); } await http<void>(`/admin/stock/${id}/disable`, { method: "PATCH", body: JSON.stringify({ enable: false }) }); }

export async function getPaymentSettings(): Promise<PaymentSettings> { if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.payment, mockPaymentSettings)); const data = await http<{ methods: BackendPaymentMethod[] }>("/payment-methods"); if (!data.methods.length) return mockPaymentSettings; return paymentToFrontend(data.methods); }
export async function updatePaymentSettings(s: PaymentSettings): Promise<PaymentSettings> { if (IS_MOCK_MODE) { save(STORAGE_KEYS.payment, s); return delay(s); } const methods: BackendPaymentMethod[] = [ { key: "bangladesh", title: "Bangladesh", instructions: s.bangladesh.instructions, accounts: [{ label: "bKash", value: s.bangladesh.bkash, note: "Send Money" }, { label: "Nagad", value: s.bangladesh.nagad, note: "Send Money" }], isActive: true }, { key: "pakistan", title: "Pakistan", instructions: s.pakistan.instructions, accounts: [{ label: "Easypaisa", value: s.pakistan.easypaisa }, { label: "JazzCash", value: s.pakistan.jazzcash }, { label: "Bank", value: s.pakistan.bank }], isActive: true }, { key: "binance", title: "Binance / Crypto", instructions: s.binance.instructions, accounts: [{ label: "Binance Pay ID", value: s.binance.payId }, { label: "Wallet Address", value: s.binance.wallet }], isActive: true } ]; await Promise.all(methods.map((m) => http(`/admin/payment-methods/${m.key}`, { method: "PUT", body: JSON.stringify(m) }))); return s; }

export async function adminLogin(email: string, password: string): Promise<boolean> { if (IS_MOCK_MODE) { const ok = email.trim().length > 0 && password.length > 0; if (ok && isBrowser) window.localStorage.setItem(STORAGE_KEYS.admin, "1"); return delay(ok, 400); } try { const res = await http<{ token: string; admin: AdminUser }>("/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }); if (res?.token && isBrowser) { window.localStorage.setItem(STORAGE_KEYS.token, res.token); window.localStorage.setItem(STORAGE_KEYS.admin, "1"); save(STORAGE_KEYS.adminInfo, res.admin); return true; } return false; } catch { return false; } }
export function getCurrentAdmin(): AdminUser | null { return load<AdminUser | null>(STORAGE_KEYS.adminInfo, null); }
export function isOwner(): boolean { return getCurrentAdmin()?.role === "owner"; }
export function isAdminAuthed(): boolean { return isBrowser ? window.localStorage.getItem(STORAGE_KEYS.admin) === "1" : false; }
export function adminLogout() { if (!isBrowser) return; window.localStorage.removeItem(STORAGE_KEYS.admin); window.localStorage.removeItem(STORAGE_KEYS.token); window.localStorage.removeItem(STORAGE_KEYS.adminInfo); }

export async function getAdminUsers(): Promise<AdminUser[]> { const data = await http<{ admins: AdminUser[] }>("/admin/users"); return data.admins; }
export async function createAdminUser(input: { email: string; password: string; nickname: string; name?: string; role?: "admin" | "owner" }): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>("/admin/users", { method: "POST", body: JSON.stringify(input) }); return data.admin; }
export async function resetAdminPassword(id: string, password: string): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>(`/admin/users/${id}/password`, { method: "PATCH", body: JSON.stringify({ password }) }); return data.admin; }
export async function changeOwnPassword(password: string): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>("/admin/users/me/password", { method: "PATCH", body: JSON.stringify({ password }) }); return data.admin; }
export async function setAdminStatus(id: string, isActive: boolean): Promise<AdminUser> { const data = await http<{ admin: AdminUser }>(`/admin/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) }); return data.admin; }
export async function getDashboard(): Promise<{ stats: DashboardStats; salesByProduct: ProductSalesRow[]; recentOrders: BackendOrder[]; recentActivity: ActivityLog[]; lowStock: { productId: string; productName: string; available: number }[] }> { return http("/admin/dashboard"); }
