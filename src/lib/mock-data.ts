export type PriceRegion = "bd" | "pk" | "world";
export type CurrencyCode = "BDT" | "PKR" | "USDT" | "USD";
export type DeliveryMode = "credentials" | "activation_code" | "login_code" | "manual";

export type Product = {
  id: string;
  backendId?: string;
  name: string;
  category: string;
  price: number;
  currency?: CurrencyCode;
  priceRegion?: PriceRegion;
  priceBDT: number;
  pricePKR: number;
  priceUSDT: number;
  worldwideCurrency: "USDT" | "USD";
  originalPrice?: number;
  originalPriceBDT?: number;
  originalPricePKR?: number;
  originalPriceUSDT?: number;
  icon: string;
  logoUrl?: string;
  shortDescription: string;
  description: string;
  features: string[];
  deliveryMode: DeliveryMode;
  deliveryMethod: string;
  terms: string;
  stock: number;
  badge?: string;
  addedBy?: string;
  updatedBy?: string;
  sortOrder?: number;
};

export type StockItem = {
  id: string;
  productId: string;
  deliveryMode: DeliveryMode;
  email: string;
  password: string;
  activationCode?: string;
  loginClientId?: string;
  loginRefreshToken?: string;
  instructions: string;
  videoUrl?: string;
  imageUrl?: string;
  status: "available" | "delivered";
  createdAt: string;
  addedBy?: string;
};

export type Order = {
  id: string;
  productId: string;
  productName: string;
  customerName: string;
  customerEmail: string;
  contact: string;
  amount: number;
  currency?: CurrencyCode;
  priceRegion?: PriceRegion;
  paymentMethod: "bangladesh" | "pakistan" | "binance";
  paymentChannel: string;
  transactionId: string;
  customerOrderRef?: string;
  status: "pending" | "approved" | "delivered" | "rejected";
  createdAt: string;
  approvedByNickname?: string;
  deliveredByNickname?: string;
  rejectedByNickname?: string;
  reviewedByNickname?: string;
};

export type PaymentSettings = {
  bangladesh: { bkash: string; nagad: string; instructions: string };
  pakistan: { easypaisa: string; jazzcash: string; bank: string; instructions: string };
  binance: { payId: string; wallet: string; instructions: string };
};

export type AdminUser = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  role: "owner" | "admin";
  isActive: boolean;
  createdByNickname?: string;
  lastLoginAt?: string;
  createdAt?: string;
};

export type DashboardStats = {
  totalProducts: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  soldOrders: number;
  availableStock: number;
};

export type ProductSalesRow = {
  productId: string;
  productName: string;
  sold: number;
  revenueBDT: number;
  revenuePKR: number;
  revenueWorld: number;
  availableStock?: number | null;
};

export type ActivityLog = {
  _id?: string;
  id?: string;
  actorNickname?: string;
  action: string;
  entityType?: string;
  message: string;
  createdAt?: string;
};

// No demo product. Everything must be added manually from the admin panel.
export const mockProducts: Product[] = [];
export const mockOrders: Order[] = [];
export const mockStock: StockItem[] = [];

export const mockPaymentSettings: PaymentSettings = {
  bangladesh: { bkash: "", nagad: "", instructions: "Send Money to this number, then submit your Transaction ID." },
  pakistan: { easypaisa: "", jazzcash: "", bank: "", instructions: "Send payment, then submit your reference ID." },
  binance: { payId: "", wallet: "", instructions: "Send USDT, then submit transaction hash/reference." },
};

export const mockCategories = [{ id: "all", name: "All Products", icon: "🌐" }];

export type PromoCode = {
  id: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  percentOff: number;
  fixedBDT: number;
  fixedPKR: number;
  fixedUSDT: number;
  maxUses: number;
  usedCount: number;
  minAmountBDT: number;
  minAmountPKR: number;
  minAmountUSDT: number;
  productIds: string[];
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdByNickname?: string;
  createdAt?: string;
};

export type AppliedPromo = {
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  percentOff: number;
  discount: number;
  originalAmount: number;
  finalAmount: number;
};

export const mockPromoCodes: PromoCode[] = [];
