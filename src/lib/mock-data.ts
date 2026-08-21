export type PriceRegion = "bd" | "pk" | "world";
export type CurrencyCode = "BDT" | "PKR" | "USDT" | "USD";
export type DeliveryMode = "credentials" | "activation_code" | "login_code" | "manual";
export type ManualInputMode = "ideogram_credentials" | "email_password" | "email_only";

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
  isFree?: boolean;
  worldwideCurrency: "USDT" | "USD";
  originalPrice?: number;
  originalPriceBDT?: number;
  originalPricePKR?: number;
  originalPriceUSDT?: number;
  purchaseCostBDT?: number;
  purchaseCostPKR?: number;
  purchaseCostUSDT?: number;
  accountCostBDT?: number;
  accountCostPKR?: number;
  accountCostUSDT?: number;
  paymentGatewayFeeBDT?: number;
  paymentGatewayFeePKR?: number;
  paymentGatewayFeeUSDT?: number;
  otherExpenseBDT?: number;
  otherExpensePKR?: number;
  otherExpenseUSDT?: number;
  icon: string;
  logoUrl?: string;
  shortDescription: string;
  description: string;
  features: string[];
  deliveryMode: DeliveryMode;
  backorderStock?: number;
  deliveryMethod: string;
  deliveryInstruction?: string;
  deliveryVideoUrl?: string;
  deliveryImageUrl?: string;
  passwordInstructionVideoUrl?: string;
  manualInputMode?: ManualInputMode;
  terms: string;
  stock: number;
  badge?: string;
  addedBy?: string;
  updatedBy?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type StockItem = {
  id: string;
  productId: string;
  deliveryMode: DeliveryMode;
  email: string;
  password: string;
  activationCode?: string;
  instructions: string;
  videoUrl?: string;
  imageUrl?: string;
  getCodeAccessDays?: number;
  status: "available" | "delivered";
  createdAt: string;
  addedBy?: string;
};

export type MailTxtAccount = {
  email: string;
  password?: string;
  refreshToken: string;
  clientId: string;
};

export type MailTxtFile = {
  id: string;
  name: string;
  accountCount: number;
  dateAdded: number;
  uploadedBy?: string;
  accounts?: MailTxtAccount[];
};

export type Order = {
  id: string;
  productId: string;
  productName: string;
  productLogoUrl?: string;
  productIcon?: string;
  batchId?: string;
  customerName: string;
  customerEmail: string;
  contact: string;
  amount: number;
  currency?: CurrencyCode;
  priceRegion?: PriceRegion;
  paymentMethod: "bangladesh" | "pakistan" | "binance" | "reseller_due" | "free";
  paymentChannel: string;
  transactionId: string;
  customerOrderRef?: string;
  status: "pending" | "approved" | "delivered" | "rejected" | "cancelled";
  createdAt: string;
  approvedByNickname?: string;
  deliveredByNickname?: string;
  rejectedByNickname?: string;
  cancelledByNickname?: string;
  cancelledAt?: string;
  cancelReason?: string;
  reviewedByNickname?: string;
  deliveryMode?: DeliveryMode;
  deliveryVideoUrl?: string;
  manualActivationRequired?: boolean;
  manualActivationSubmitted?: boolean;
  manualActivationActivated?: boolean;
  manualInputMode?: ManualInputMode;
  isBackorder?: boolean;
  deliveryDetailsAdded?: boolean;
  getCodeAccessExpiresAt?: string;
  deliveryEmail?: string;
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
  currency?: "PKR";
  totalSalesPKR?: number;
  duePKR?: number;
  profitPKR?: number;
  orderCount?: number;
};

export type DashboardStats = {
  totalProducts: number;
  totalCustomers?: number;
  signedUpUsers?: number;
  uniqueVisitors?: number;
  totalVisits?: number;
  visitsToday?: number;
  newCustomers?: number;
  returningCustomers?: number;
  repeatPurchaseRate?: number;
  averagePurchasesPerCustomer?: number;
  pendingOrders: number;
  approvedOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  refundedOrders?: number;
  soldOrders: number;
  totalOrders?: number;
  availableStock: number;
  lowStockProducts?: number;
  outOfStockProducts?: number;
  pendingOverOneHour?: number;
  revenue?: MoneyBag;
  profit?: MoneyBag;
  discounts?: MoneyBag;
  rejectedAmount?: MoneyBag;
  averageOrderValue?: MoneyBag;
  previousRevenue?: MoneyBag;
  previousProfit?: MoneyBag;
  revenueChangePct?: number;
  profitChangePct?: number;
  orderChangePct?: number;
};

export type MoneyBag = Record<CurrencyCode, number>;

export type DashboardKpi = {
  key: string;
  title: string;
  value: number | MoneyBag;
  previous?: number | MoneyBag;
  changePct?: number;
  sparkline?: number[];
};

export type DashboardChartRow = {
  key: string;
  label: string;
  revenue: MoneyBag;
  profit: MoneyBag;
  orders: number;
};

export type DashboardStatusRow = {
  status: string;
  label: string;
  count: number;
  percent: number;
  color: string;
  to?: string;
};

export type ProductPerformanceRow = {
  productId: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: MoneyBag;
  purchaseCost: MoneyBag;
  netProfit: MoneyBag;
  profitMargin: number;
  remainingStock: number;
  status: string;
};

export type TopCustomerRow = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalProducts: number;
  totalSpent: MoneyBag;
  totalProfit: MoneyBag;
  pendingOrders: number;
  deliveredOrders: number;
  rejectedOrders: number;
  lastOrderAt?: string;
  status: string;
  products?: { name: string; quantity: number }[];
};

export type AttentionItem = {
  type: string;
  priority: "warning" | "danger" | "info" | "success";
  title: string;
  description: string;
  actionLabel?: string;
  to?: string;
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
  showOnHomepage?: boolean;
  allowResellers?: boolean;
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
