/* eslint-disable */
// @ts-nocheck
// noinspection JSUnusedGlobalSymbols

import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as ProductsRouteImport } from './routes/products'
import { Route as ProductsIdRouteImport } from './routes/products.$id'
import { Route as CheckoutProductIdRouteImport } from './routes/checkout.$productId'
import { Route as OrderPendingRouteImport } from './routes/order-pending'
import { Route as OrderStatusOrderIdRouteImport } from './routes/order-status.$orderId'
import { Route as TrackOrdersRouteImport } from './routes/track-orders'
import { Route as AdminRouteImport } from './routes/admin'
import { Route as AdminIndexRouteImport } from './routes/admin.index'
import { Route as AdminLoginRouteImport } from './routes/admin.login'
import { Route as AdminProductsRouteImport } from './routes/admin.products'
import { Route as AdminPaymentSettingsRouteImport } from './routes/admin.payment-settings'
import { Route as AdminStockRouteImport } from './routes/admin.stock'
import { Route as AdminUsersRouteImport } from './routes/admin.users'
import { Route as AdminTrackOrdersRouteImport } from './routes/admin.track-orders'
import { Route as AdminOrdersRouteImport } from './routes/admin.orders'
import { Route as AdminOrdersApprovedRouteImport } from './routes/admin.orders.approved'
import { Route as AdminOrdersDeliveredRouteImport } from './routes/admin.orders.delivered'
import { Route as AdminOrdersPendingRouteImport } from './routes/admin.orders.pending'
import { Route as AdminOrdersRejectedRouteImport } from './routes/admin.orders.rejected'

const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const ProductsRoute = ProductsRouteImport.update({ id: '/products', path: '/products', getParentRoute: () => rootRouteImport } as any)
const ProductsIdRoute = ProductsIdRouteImport.update({ id: '/$id', path: '/$id', getParentRoute: () => ProductsRoute } as any)
const CheckoutProductIdRoute = CheckoutProductIdRouteImport.update({ id: '/checkout/$productId', path: '/checkout/$productId', getParentRoute: () => rootRouteImport } as any)
const OrderPendingRoute = OrderPendingRouteImport.update({ id: '/order-pending', path: '/order-pending', getParentRoute: () => rootRouteImport } as any)
const OrderStatusOrderIdRoute = OrderStatusOrderIdRouteImport.update({ id: '/order-status/$orderId', path: '/order-status/$orderId', getParentRoute: () => rootRouteImport } as any)
const TrackOrdersRoute = TrackOrdersRouteImport.update({ id: '/track-orders', path: '/track-orders', getParentRoute: () => rootRouteImport } as any)

const AdminRoute = AdminRouteImport.update({ id: '/admin', path: '/admin', getParentRoute: () => rootRouteImport } as any)
const AdminIndexRoute = AdminIndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => AdminRoute } as any)
const AdminLoginRoute = AdminLoginRouteImport.update({ id: '/login', path: '/login', getParentRoute: () => AdminRoute } as any)
const AdminProductsRoute = AdminProductsRouteImport.update({ id: '/products', path: '/products', getParentRoute: () => AdminRoute } as any)
const AdminPaymentSettingsRoute = AdminPaymentSettingsRouteImport.update({ id: '/payment-settings', path: '/payment-settings', getParentRoute: () => AdminRoute } as any)
const AdminStockRoute = AdminStockRouteImport.update({ id: '/stock', path: '/stock', getParentRoute: () => AdminRoute } as any)
const AdminUsersRoute = AdminUsersRouteImport.update({ id: '/users', path: '/users', getParentRoute: () => AdminRoute } as any)
const AdminTrackOrdersRoute = AdminTrackOrdersRouteImport.update({ id: '/track-orders', path: '/track-orders', getParentRoute: () => AdminRoute } as any)
const AdminOrdersRoute = AdminOrdersRouteImport.update({ id: '/orders', path: '/orders', getParentRoute: () => AdminRoute } as any)
const AdminOrdersApprovedRoute = AdminOrdersApprovedRouteImport.update({ id: '/approved', path: '/approved', getParentRoute: () => AdminOrdersRoute } as any)
const AdminOrdersDeliveredRoute = AdminOrdersDeliveredRouteImport.update({ id: '/delivered', path: '/delivered', getParentRoute: () => AdminOrdersRoute } as any)
const AdminOrdersPendingRoute = AdminOrdersPendingRouteImport.update({ id: '/pending', path: '/pending', getParentRoute: () => AdminOrdersRoute } as any)
const AdminOrdersRejectedRoute = AdminOrdersRejectedRouteImport.update({ id: '/rejected', path: '/rejected', getParentRoute: () => AdminOrdersRoute } as any)

const AdminOrdersRouteWithChildren = AdminOrdersRoute._addFileChildren({
  AdminOrdersApprovedRoute,
  AdminOrdersDeliveredRoute,
  AdminOrdersPendingRoute,
  AdminOrdersRejectedRoute,
})

const AdminRouteWithChildren = AdminRoute._addFileChildren({
  AdminLoginRoute,
  AdminOrdersRoute: AdminOrdersRouteWithChildren,
  AdminPaymentSettingsRoute,
  AdminProductsRoute,
  AdminStockRoute,
  AdminUsersRoute,
  AdminTrackOrdersRoute,
  AdminIndexRoute,
})

const ProductsRouteWithChildren = ProductsRoute._addFileChildren({ ProductsIdRoute })

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/products': typeof ProductsRouteWithChildren
  '/products/$id': typeof ProductsIdRoute
  '/checkout/$productId': typeof CheckoutProductIdRoute
  '/order-pending': typeof OrderPendingRoute
  '/order-status/$orderId': typeof OrderStatusOrderIdRoute
  '/track-orders': typeof TrackOrdersRoute
  '/admin': typeof AdminRouteWithChildren
  '/admin/': typeof AdminIndexRoute
  '/admin/login': typeof AdminLoginRoute
  '/admin/products': typeof AdminProductsRoute
  '/admin/payment-settings': typeof AdminPaymentSettingsRoute
  '/admin/stock': typeof AdminStockRoute
  '/admin/users': typeof AdminUsersRoute
  '/admin/track-orders': typeof AdminTrackOrdersRoute
  '/admin/orders': typeof AdminOrdersRouteWithChildren
  '/admin/orders/approved': typeof AdminOrdersApprovedRoute
  '/admin/orders/delivered': typeof AdminOrdersDeliveredRoute
  '/admin/orders/pending': typeof AdminOrdersPendingRoute
  '/admin/orders/rejected': typeof AdminOrdersRejectedRoute
}
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRoutesById extends FileRoutesByFullPath { __root__: typeof rootRouteImport }
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: keyof FileRoutesByFullPath
  fileRoutesByTo: FileRoutesByTo
  to: keyof FileRoutesByTo
  id: keyof FileRoutesById
  fileRoutesById: FileRoutesById
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': { id: '/'; path: '/'; fullPath: '/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport }
    '/products': { id: '/products'; path: '/products'; fullPath: '/products'; preLoaderRoute: typeof ProductsRouteImport; parentRoute: typeof rootRouteImport }
    '/products/$id': { id: '/products/$id'; path: '/$id'; fullPath: '/products/$id'; preLoaderRoute: typeof ProductsIdRouteImport; parentRoute: typeof ProductsRoute }
    '/checkout/$productId': { id: '/checkout/$productId'; path: '/checkout/$productId'; fullPath: '/checkout/$productId'; preLoaderRoute: typeof CheckoutProductIdRouteImport; parentRoute: typeof rootRouteImport }
    '/order-pending': { id: '/order-pending'; path: '/order-pending'; fullPath: '/order-pending'; preLoaderRoute: typeof OrderPendingRouteImport; parentRoute: typeof rootRouteImport }
    '/order-status/$orderId': { id: '/order-status/$orderId'; path: '/order-status/$orderId'; fullPath: '/order-status/$orderId'; preLoaderRoute: typeof OrderStatusOrderIdRouteImport; parentRoute: typeof rootRouteImport }
    '/track-orders': { id: '/track-orders'; path: '/track-orders'; fullPath: '/track-orders'; preLoaderRoute: typeof TrackOrdersRouteImport; parentRoute: typeof rootRouteImport }
    '/admin': { id: '/admin'; path: '/admin'; fullPath: '/admin'; preLoaderRoute: typeof AdminRouteImport; parentRoute: typeof rootRouteImport }
    '/admin/': { id: '/admin/'; path: '/'; fullPath: '/admin/'; preLoaderRoute: typeof AdminIndexRouteImport; parentRoute: typeof AdminRoute }
    '/admin/login': { id: '/admin/login'; path: '/login'; fullPath: '/admin/login'; preLoaderRoute: typeof AdminLoginRouteImport; parentRoute: typeof AdminRoute }
    '/admin/products': { id: '/admin/products'; path: '/products'; fullPath: '/admin/products'; preLoaderRoute: typeof AdminProductsRouteImport; parentRoute: typeof AdminRoute }
    '/admin/payment-settings': { id: '/admin/payment-settings'; path: '/payment-settings'; fullPath: '/admin/payment-settings'; preLoaderRoute: typeof AdminPaymentSettingsRouteImport; parentRoute: typeof AdminRoute }
    '/admin/stock': { id: '/admin/stock'; path: '/stock'; fullPath: '/admin/stock'; preLoaderRoute: typeof AdminStockRouteImport; parentRoute: typeof AdminRoute }
    '/admin/users': { id: '/admin/users'; path: '/users'; fullPath: '/admin/users'; preLoaderRoute: typeof AdminUsersRouteImport; parentRoute: typeof AdminRoute }
    '/admin/track-orders': { id: '/admin/track-orders'; path: '/track-orders'; fullPath: '/admin/track-orders'; preLoaderRoute: typeof AdminTrackOrdersRouteImport; parentRoute: typeof AdminRoute }
    '/admin/orders': { id: '/admin/orders'; path: '/orders'; fullPath: '/admin/orders'; preLoaderRoute: typeof AdminOrdersRouteImport; parentRoute: typeof AdminRoute }
    '/admin/orders/approved': { id: '/admin/orders/approved'; path: '/approved'; fullPath: '/admin/orders/approved'; preLoaderRoute: typeof AdminOrdersApprovedRouteImport; parentRoute: typeof AdminOrdersRoute }
    '/admin/orders/delivered': { id: '/admin/orders/delivered'; path: '/delivered'; fullPath: '/admin/orders/delivered'; preLoaderRoute: typeof AdminOrdersDeliveredRouteImport; parentRoute: typeof AdminOrdersRoute }
    '/admin/orders/pending': { id: '/admin/orders/pending'; path: '/pending'; fullPath: '/admin/orders/pending'; preLoaderRoute: typeof AdminOrdersPendingRouteImport; parentRoute: typeof AdminOrdersRoute }
    '/admin/orders/rejected': { id: '/admin/orders/rejected'; path: '/rejected'; fullPath: '/admin/orders/rejected'; preLoaderRoute: typeof AdminOrdersRejectedRouteImport; parentRoute: typeof AdminOrdersRoute }
  }
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AdminRoute: typeof AdminRouteWithChildren
  ProductsRoute: typeof ProductsRouteWithChildren
  CheckoutProductIdRoute: typeof CheckoutProductIdRoute
  OrderPendingRoute: typeof OrderPendingRoute
  OrderStatusOrderIdRoute: typeof OrderStatusOrderIdRoute
  TrackOrdersRoute: typeof TrackOrdersRoute
}
const rootRouteChildren: RootRouteChildren = {
  IndexRoute,
  AdminRoute: AdminRouteWithChildren,
  ProductsRoute: ProductsRouteWithChildren,
  CheckoutProductIdRoute,
  OrderPendingRoute,
  OrderStatusOrderIdRoute,
  TrackOrdersRoute,
}
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()
