// Centralized mock product data. Re-exports from the existing mock-data module
// so the rest of the app can keep importing from `@/lib/mock-data` if needed.
export { mockProducts as products, mockCategories as categories } from "@/lib/mock-data";
export type { Product } from "@/lib/mock-data";
