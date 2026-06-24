/**
 * API service layer.
 *
 * Live mode is enabled by default and points to the Render backend.
 * To use mock/localStorage mode while testing locally, set:
 * VITE_USE_MOCK=true
 */
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
  orderTokens: "mp_order_tokens",
};

const isBrowser = typeof window !== "undefined";
const objectIdRe = /^[a-f\d]{24}$/i;

/* ---------- localStorage helpers (mock mode + tokens) ---------- */

function load<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  if (!isBrowser) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

function getToken(): string | null {
  if (!isBrowser) return null;
  return window.localStorage.getItem(STORAGE_KEYS.token);
}

function getOrderTokens(): Record<string, string> {
  return load<Record<string, string>>(STORAGE_KEYS.orderTokens, {});
}

function saveOrderToken(orderId: string, token: string) {
  if (!token) return;
  const tokens = getOrderTokens();
  tokens[orderId] = token;
  save(STORAGE_KEYS.orderTokens, tokens);
}

function getOrderToken(orderId: string): string | null {
  return getOrderTokens()[orderId] || null;
}

/* ---------- HTTP helper (live mode) ---------- */

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/* ---------- Backend adapters ---------- */

type BackendProduct = {
  _id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  imageUrl?: string;
  priceBDT?: number;
  pricePKR?: number;
  priceUSDT?: number;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
  availableStock?: number;
  createdAt?: string;
};

type BackendPaymentMethod = {
  key: "bangladesh" | "pakistan" | "binance";
  title: string;
  instructions: string;
  accounts?: { label?: string; value?: string; note?: string }[];
  isActive?: boolean;
};

type BackendOrder = {
  _id?: string;
  orderId: string;
  productId?: string | { _id?: string; title?: string; slug?: string };
  productSnapshot?: { title?: string; price?: number; currency?: string };
  customer?: { name?: string; email?: string; whatsapp?: string };
  paymentMethod: "bangladesh" | "pakistan" | "binance";
  transactionId?: string;
  paymentNote?: string;
  status: Order["status"];
  createdAt?: string;
  reviewedAt?: string;
  rejectReason?: string | null;
  deliveryAvailable?: boolean;
};

type BackendStock = {
  _id: string;
  productId?: string | { _id?: string; title?: string; slug?: string };
  status: "available" | "reserved" | "delivered" | "disabled";
  adminNote?: string;
  createdAt?: string;
  payload?: { email?: string; password?: string; instruction?: string };
};

export type DeliveryPayload = {
  email?: string;
  password?: string;
  instruction?: string;
  instructions?: string;
  extra?: Record<string, unknown>;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || `product-${Date.now()}`;
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function productToFrontend(p: BackendProduct): Product {
  return {
    id: p.slug || p._id,
    backendId: p._id,
    name: p.title,
    category: p.category || "AI Tools",
    price: money(p.priceUSDT ?? p.priceBDT ?? 0),
    icon: "✨",
    logoUrl: p.imageUrl || undefined,
    shortDescription: p.shortDescription || p.description || "",
    description: p.description || p.shortDescription || "",
    features: Array.isArray(p.features) ? p.features : [],
    deliveryMethod: "Delivered after admin approval",
    terms: "Do not change password/recovery info unless instructed by admin.",
    stock: money(p.availableStock ?? 0),
  };
}

function productToBackend(p: Product) {
  const slug = /^[a-z0-9-]+$/.test(p.id) ? p.id : slugify(p.name);
  return {
    title: p.name,
    slug,
    description: p.description || "",
    shortDescription: p.shortDescription || "",
    category: p.category || "AI Tools",
    imageUrl: p.logoUrl || "",
    priceBDT: money(p.price),
    pricePKR: money(p.price),
    priceUSDT: money(p.price),
    features: p.features || [],
    isActive: true,
    sortOrder: 0,
  };
}

function getAccount(method: BackendPaymentMethod | undefined, labelIncludes: string) {
  return method?.accounts?.find((a) => (a.label || "").toLowerCase().includes(labelIncludes))?.value || "";
}

function paymentToFrontend(methods: BackendPaymentMethod[]): PaymentSettings {
  const bd = methods.find((m) => m.key === "bangladesh");
  const pk = methods.find((m) => m.key === "pakistan");
  const bn = methods.find((m) => m.key === "binance");
  return {
    bangladesh: {
      bkash: getAccount(bd, "bkash"),
      nagad: getAccount(bd, "nagad"),
      instructions: bd?.instructions || mockPaymentSettings.bangladesh.instructions,
    },
    pakistan: {
      easypaisa: getAccount(pk, "easypaisa"),
      jazzcash: getAccount(pk, "jazzcash"),
      bank: getAccount(pk, "bank"),
      instructions: pk?.instructions || mockPaymentSettings.pakistan.instructions,
    },
    binance: {
      payId: getAccount(bn, "pay"),
      wallet: getAccount(bn, "wallet"),
      instructions: bn?.instructions || mockPaymentSettings.binance.instructions,
    },
  };
}

function parsePaymentNote(note?: string) {
  const text = note || "";
  const channel = text.match(/Channel:\s*([^;]+)/i)?.[1]?.trim() || "Manual";
  const ref = text.match(/Reference:\s*([^;]+)/i)?.[1]?.trim() || undefined;
  return { channel, ref };
}

function orderToFrontend(o: BackendOrder): Order {
  const note = parsePaymentNote(o.paymentNote);
  const productId = typeof o.productId === "object" ? (o.productId.slug || o.productId._id || "") : (o.productId || "");
  const status = o.deliveryAvailable && o.status === "approved" ? "delivered" : o.status;
  return {
    id: o.orderId,
    productId,
    productName: o.productSnapshot?.title || (typeof o.productId === "object" ? o.productId.title : "") || "Product",
    customerName: o.customer?.name || "",
    customerEmail: o.customer?.email || "",
    contact: o.customer?.whatsapp || "",
    amount: money(o.productSnapshot?.price),
    paymentMethod: o.paymentMethod,
    paymentChannel: note.channel,
    transactionId: o.transactionId || "",
    customerOrderRef: note.ref,
    status,
    createdAt: o.createdAt || new Date().toISOString(),
  };
}

function stockToFrontend(s: BackendStock): StockItem {
  const productId = typeof s.productId === "object" ? (s.productId.slug || s.productId._id || "") : (s.productId || "");
  return {
    id: s._id,
    productId,
    email: s.payload?.email || "Encrypted",
    password: s.payload?.password ? "••••••••" : "Encrypted",
    instructions: s.payload?.instruction || s.adminNote || "Encrypted delivery item",
    status: s.status === "available" ? "available" : "delivered",
    createdAt: s.createdAt || new Date().toISOString(),
  };
}

async function resolveBackendProductId(productIdOrSlug: string): Promise<string> {
  if (objectIdRe.test(productIdOrSlug)) return productIdOrSlug;
  const product = await getProductById(productIdOrSlug);
  return product?.backendId || productIdOrSlug;
}

/* ---------- Products ---------- */

export async function getProducts(): Promise<Product[]> {
  if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.products, mockProducts));
  const data = await http<{ products: BackendProduct[] }>("/products");
  return data.products.map(productToFrontend);
}

export async function getProductById(id: string): Promise<Product | null> {
  if (IS_MOCK_MODE) {
    const list = await getProducts();
    return list.find((p) => p.id === id || p.backendId === id) ?? null;
  }
  try {
    if (objectIdRe.test(id)) {
      const list = await getProducts();
      return list.find((p) => p.backendId === id) ?? null;
    }
    const data = await http<{ product: BackendProduct }>(`/products/${id}`);
    return productToFrontend(data.product);
  } catch {
    return null;
  }
}

export async function createProduct(p: Product): Promise<Product> {
  if (IS_MOCK_MODE) {
    const list = await getProducts();
    save(STORAGE_KEYS.products, [p, ...list]);
    return delay(p);
  }
  const data = await http<{ product: BackendProduct }>("/admin/products", {
    method: "POST",
    body: JSON.stringify(productToBackend(p)),
  });
  return productToFrontend(data.product);
}

export async function updateProduct(p: Product): Promise<Product> {
  if (IS_MOCK_MODE) {
    const list = await getProducts();
    save(STORAGE_KEYS.products, list.map((x) => (x.id === p.id ? p : x)));
    return delay(p);
  }
  const backendId = p.backendId || (await resolveBackendProductId(p.id));
  const data = await http<{ product: BackendProduct }>(`/admin/products/${backendId}`, {
    method: "PATCH",
    body: JSON.stringify(productToBackend(p)),
  });
  return productToFrontend(data.product);
}

export async function deleteProduct(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    const list = await getProducts();
    save(STORAGE_KEYS.products, list.filter((x) => x.id !== id));
    return delay(undefined);
  }
  const backendId = await resolveBackendProductId(id);
  await http<void>(`/admin/products/${backendId}`, { method: "DELETE" });
}

export async function getCategories(): Promise<typeof mockCategories> {
  if (IS_MOCK_MODE) return delay(mockCategories);
  const products = await getProducts();
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  return [{ id: "all", name: "All Products", icon: "🌐" }, ...categories.map((name) => ({ id: name, name, icon: "✨" }))];
}

/* ---------- Orders ---------- */

export async function getOrders(): Promise<Order[]> {
  if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.orders, mockOrders));
  const data = await http<{ orders: BackendOrder[] }>("/admin/orders");
  return data.orders.map(orderToFrontend);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (IS_MOCK_MODE) {
    const list = await getOrders();
    return list.find((o) => o.id === id) ?? null;
  }
  const token = getOrderToken(id);
  if (!token) return null;
  try {
    const data = await http<{ order: BackendOrder }>(`/orders/${id}/status?token=${encodeURIComponent(token)}`);
    return orderToFrontend(data.order);
  } catch {
    return null;
  }
}

export async function createOrder(
  o: Omit<Order, "id" | "status" | "createdAt">,
): Promise<Order> {
  if (IS_MOCK_MODE) {
    const list = await getOrders();
    const order: Order = {
      ...o,
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    save(STORAGE_KEYS.orders, [order, ...list]);
    return delay(order);
  }
  const productBackendId = await resolveBackendProductId(o.productId);
  const paymentNote = `Channel: ${o.paymentChannel}${o.customerOrderRef ? `; Reference: ${o.customerOrderRef}` : ""}`;
  const data = await http<{
    order: { orderId: string; status: Order["status"]; productTitle: string; amount: number; currency: string };
    accessToken: string;
  }>("/orders", {
    method: "POST",
    body: JSON.stringify({
      productId: productBackendId,
      customer: {
        name: o.customerName,
        email: o.customerEmail,
        whatsapp: o.contact || "",
      },
      paymentMethod: o.paymentMethod,
      transactionId: o.transactionId,
      paymentNote,
    }),
  });

  saveOrderToken(data.order.orderId, data.accessToken);

  return {
    ...o,
    id: data.order.orderId,
    productName: data.order.productTitle || o.productName,
    amount: money(data.order.amount || o.amount),
    status: data.order.status,
    createdAt: new Date().toISOString(),
  };
}

export async function updateOrderStatus(
  id: string,
  status: Order["status"],
): Promise<Order | null> {
  if (IS_MOCK_MODE) {
    const list = await getOrders();
    const next = list.map((o) => (o.id === id ? { ...o, status } : o));
    save(STORAGE_KEYS.orders, next);
    return delay(next.find((o) => o.id === id) ?? null);
  }

  if (status === "approved" || status === "delivered") {
    const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/approve`, { method: "POST" });
    return orderToFrontend(data.order);
  }

  if (status === "rejected") {
    const data = await http<{ order: BackendOrder }>(`/admin/orders/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason: "Rejected by admin" }),
    });
    return orderToFrontend(data.order);
  }

  throw new Error("Restoring pending orders is not supported in live mode.");
}

export async function getOrderDelivery(orderId: string): Promise<DeliveryPayload | null> {
  if (IS_MOCK_MODE) return null;
  const token = getOrderToken(orderId);
  if (!token) return null;
  try {
    const data = await http<{ delivery: DeliveryPayload }>(`/orders/${orderId}/delivery?token=${encodeURIComponent(token)}`);
    return data.delivery;
  } catch {
    return null;
  }
}

/* ---------- Stock ---------- */

export async function getStock(): Promise<StockItem[]> {
  if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.stock, mockStock));
  const data = await http<{ stock: BackendStock[] }>("/admin/stock");
  return data.stock.map(stockToFrontend);
}

export async function createStock(s: Omit<StockItem, "id" | "createdAt">): Promise<StockItem> {
  if (IS_MOCK_MODE) {
    const list = await getStock();
    const item: StockItem = {
      ...s,
      id: `STK-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
    };
    save(STORAGE_KEYS.stock, [item, ...list]);
    return delay(item);
  }
  const productId = await resolveBackendProductId(s.productId);
  const data = await http<{ stock: BackendStock }>("/admin/stock", {
    method: "POST",
    body: JSON.stringify({
      productId,
      type: s.email || s.password ? "credentials" : "instruction",
      payload: {
        email: s.email,
        password: s.password,
        instruction: s.instructions,
      },
      adminNote: s.instructions || "",
    }),
  });
  return stockToFrontend(data.stock);
}

export async function deleteStock(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    const list = await getStock();
    save(STORAGE_KEYS.stock, list.filter((s) => s.id !== id));
    return delay(undefined);
  }
  await http<void>(`/admin/stock/${id}/disable`, {
    method: "PATCH",
    body: JSON.stringify({ enable: false }),
  });
}

/* ---------- Payment Settings ---------- */

export async function getPaymentSettings(): Promise<PaymentSettings> {
  if (IS_MOCK_MODE) return delay(load(STORAGE_KEYS.payment, mockPaymentSettings));
  const data = await http<{ methods: BackendPaymentMethod[] }>("/payment-methods");
  if (!data.methods.length) return mockPaymentSettings;
  return paymentToFrontend(data.methods);
}

export async function updatePaymentSettings(s: PaymentSettings): Promise<PaymentSettings> {
  if (IS_MOCK_MODE) {
    save(STORAGE_KEYS.payment, s);
    return delay(s);
  }

  const methods: BackendPaymentMethod[] = [
    {
      key: "bangladesh",
      title: "Bangladesh",
      instructions: s.bangladesh.instructions,
      accounts: [
        { label: "bKash", value: s.bangladesh.bkash, note: "Send Money" },
        { label: "Nagad", value: s.bangladesh.nagad, note: "Send Money" },
      ],
      isActive: true,
    },
    {
      key: "pakistan",
      title: "Pakistan",
      instructions: s.pakistan.instructions,
      accounts: [
        { label: "Easypaisa", value: s.pakistan.easypaisa },
        { label: "JazzCash", value: s.pakistan.jazzcash },
        { label: "Bank", value: s.pakistan.bank },
      ],
      isActive: true,
    },
    {
      key: "binance",
      title: "Binance / Crypto",
      instructions: s.binance.instructions,
      accounts: [
        { label: "Binance Pay ID", value: s.binance.payId },
        { label: "Wallet Address", value: s.binance.wallet },
      ],
      isActive: true,
    },
  ];

  await Promise.all(methods.map((m) => http(`/admin/payment-methods/${m.key}`, { method: "PUT", body: JSON.stringify(m) })));
  return s;
}

/* ---------- Admin auth ---------- */

export async function adminLogin(email: string, password: string): Promise<boolean> {
  if (IS_MOCK_MODE) {
    const ok = email.trim().length > 0 && password.length > 0;
    if (ok && isBrowser) window.localStorage.setItem(STORAGE_KEYS.admin, "1");
    return delay(ok, 400);
  }
  try {
    const res = await http<{ token: string }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res?.token && isBrowser) {
      window.localStorage.setItem(STORAGE_KEYS.token, res.token);
      window.localStorage.setItem(STORAGE_KEYS.admin, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isAdminAuthed(): boolean {
  if (!isBrowser) return false;
  return window.localStorage.getItem(STORAGE_KEYS.admin) === "1";
}

export function adminLogout() {
  if (!isBrowser) return;
  window.localStorage.removeItem(STORAGE_KEYS.admin);
  window.localStorage.removeItem(STORAGE_KEYS.token);
}
