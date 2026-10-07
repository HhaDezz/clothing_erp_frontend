import React, { lazy } from 'react';
import { RouteProps } from 'react-router-dom';
import {
	dashboardPagesMenu,
	masterDataMenu,
	salesMenu,
	inventoryMenu,
	productionMenu,
	purchasingMenu,
	importMenu,
	reportsMenu,
	goodsTransferMenu,
} from '../menu';
import Login from '../pages/presentation/auth/Login';

const SALES = {
	POS: lazy(() => import('../pages/presentation/pos/PosPage')),
	SALES_ORDERS: lazy(() => import('../pages/presentation/sales/SalesOrdersPage')),
	INVOICES: lazy(() => import('../pages/presentation/sales/InvoicesPage')),
	CASHIER_SHIFTS: lazy(() => import('../pages/presentation/sales/CashierShiftsPage')),
};

const INVENTORY = {
	STOCK_LEDGER: lazy(() => import('../pages/presentation/inventory/StockLedgerPage')),
	SHOWROOM_ITEM_LOG: lazy(() => import('../pages/presentation/inventory/ShowroomItemLogPage')),
	BARCODE_ITEM_LOG: lazy(() => import('../pages/presentation/inventory/BarcodeItemLogPage')),
	WAREHOUSES: lazy(() => import('../pages/presentation/inventory/WarehousesPage')),
};

const PRODUCTION = {
	SEW_AND_SELL: lazy(() => import('../pages/presentation/production/SewAndSellOrdersPage')),
	WORK_ORDERS: lazy(() => import('../pages/presentation/production/WorkOrdersPage')),
	QUALITY_CHECKS: lazy(() => import('../pages/presentation/production/QualityCheckPage')),
	DELIVERIES: lazy(() => import('../pages/presentation/production/DeliveriesPage')),
};

const PURCHASING = {
	SUPPLIERS: lazy(() => import('../pages/presentation/purchasing/SuppliersPage')),
	INQUIRY_REVIEW: lazy(() => import('../pages/presentation/purchasing/ProcurementInquiryReviewPage')),
	PURCHASE_INQUIRIES: lazy(() => import('../pages/presentation/purchasing/PurchaseInquiriesPage')),
	PURCHASE_ORDERS: lazy(() => import('../pages/presentation/purchasing/PurchaseOrdersPage')),
	GRN: lazy(() => import('../pages/presentation/purchasing/GrnPage')),
};

const IMPORT = {
	SHIPMENTS: lazy(() => import('../pages/presentation/import-management/ImportShipmentsPage')),
	PRICE_REVIEW: lazy(() => import('../pages/presentation/import-management/ImportPriceReviewPage')),
	RECEIVING: lazy(() => import('../pages/presentation/import-management/ImportReceivingPage')),
	QA: lazy(() => import('../pages/presentation/import-management/ImportQaPage')),
	GRN: lazy(() => import('../pages/presentation/import-management/ImportGrnPage')),
	VAT: lazy(() => import('../pages/presentation/import-management/ImportVatPage')),
	HIGHER_APPROVAL: lazy(
		() => import('../pages/presentation/import-management/ImportHigherApprovalPage'),
	),
	DEFECTIVE_REASONS: lazy(
		() => import('../pages/presentation/import-management/DefectiveReasonsPage'),
	),
};

const LANDING = {
	DASHBOARD: lazy(() => import('../pages/presentation/dashboard/DashboardPage')),
};

const REPORTS = {
	// OVERVIEW: lazy(() => import('../pages/presentation/reports/ReportsOverviewPage')),
	SECTION: lazy(() => import('../pages/presentation/reports/ReportSectionPage')),
	AUDIT_LOGS: lazy(() => import('../pages/presentation/reports/AuditLogsPage')),
	PURCHASING_INQUIRY: lazy(
		() => import('../pages/presentation/reports/PurchasingInquiryReportPage'),
	),
	LIVE_PROFIT: lazy(() => import('../pages/presentation/reports/LiveProfitPage')),
};

const USER_MANAGEMENT = {
	USERS: lazy(() => import('../pages/presentation/user-management/UsersPage')),
	ROLES: lazy(() => import('../pages/presentation/role-management/RolesPage')),
};

const MASTER_DATA = {
	PRODUCTS: lazy(() => import('../pages/presentation/product-management/ProductsPage')),
	BRANDS: lazy(() => import('../pages/presentation/product-management/BrandsPage')),
	MATERIALS: lazy(() => import('../pages/presentation/material-management/MaterialsPage')),
	MEASUREMENTS: lazy(
		() => import('../pages/presentation/measurement-management/MeasurementsPage'),
	),
	CUSTOMERS: lazy(() => import('../pages/presentation/customer-management/CustomersPage')),
	LOYALTY_PROGRAMME: lazy(
		() => import('../pages/presentation/customer-management/LoyaltyProgrammePage'),
	),
	GIFT_CARDS: lazy(
		() => import('../pages/presentation/customer-management/GiftCardsPage'),
	),
	SEGMENTS: lazy(
		() => import('../pages/presentation/customer-management/SegmentBuilderPage'),
	),
	CAMPAIGNS: lazy(
		() => import('../pages/presentation/customer-management/CampaignsPage'),
	),
	WAREHOUSE_ACCESS: lazy(
		() => import('../pages/presentation/user-management/WarehouseAccessPage'),
	),
	SHOWROOM_ACCESS: lazy(
		() => import('../pages/presentation/user-management/ShowroomAccessPage'),
	),
	SHOWROOMS: lazy(() => import('../pages/presentation/inventory/ShowroomsPage')),
};

const GOODS_TRANSFER = {
	REQUESTS: lazy(() => import('../pages/presentation/goods-transfer/GoodsTransferRequestsPage')),
	REVIEW: lazy(() => import('../pages/presentation/goods-transfer/GoodsTransferReviewPage')),
	WAREHOUSE: lazy(() => import('../pages/presentation/goods-transfer/GoodsTransferWarehousePage')),
};

const presentation: RouteProps[] = [
	{
		path: dashboardPagesMenu.dashboard.path,
		element: <LANDING.DASHBOARD />,
	},
	// {
	// 	path: reportsMenu.overview.path,
	// 	element: <REPORTS.OVERVIEW />,
	// },
	{
		path: reportsMenu.sales.path,
		element: <REPORTS.SECTION reportType='sales' />,
	},
	{
		path: reportsMenu.payments.path,
		element: <REPORTS.SECTION reportType='payments' />,
	},
	{
		path: reportsMenu.inventory.path,
		element: <REPORTS.SECTION reportType='inventory' />,
	},
	{
		path: reportsMenu.purchasing.path,
		element: <REPORTS.SECTION reportType='purchasing' />,
	},
	{
		path: reportsMenu.production.path,
		element: <REPORTS.SECTION reportType='production' />,
	},
	{
		path: reportsMenu.quality.path,
		element: <REPORTS.SECTION reportType='quality' />,
	},
	{
		path: reportsMenu.deliveries.path,
		element: <REPORTS.SECTION reportType='deliveries' />,
	},
	{
		path: reportsMenu.customers.path,
		element: <REPORTS.SECTION reportType='customers' />,
	},
	{
		path: reportsMenu.auditLogs.path,
		element: <REPORTS.AUDIT_LOGS />,
	},
	{
		path: reportsMenu.purchasingInquiry.path,
		element: <REPORTS.PURCHASING_INQUIRY />,
	},
	{
		path: reportsMenu.liveProfit.path,
		element: <REPORTS.LIVE_PROFIT />,
	},
	{
		path: masterDataMenu.users.path,
		element: <USER_MANAGEMENT.USERS />,
	},
	{
		path: masterDataMenu.roles.path,
		element: <USER_MANAGEMENT.ROLES />,
	},
	{
		path: masterDataMenu.products.path,
		element: <MASTER_DATA.PRODUCTS />,
	},
	{
		path: masterDataMenu.brands.path,
		element: <MASTER_DATA.BRANDS />,
	},
	{
		path: masterDataMenu.materials.path,
		element: <MASTER_DATA.MATERIALS />,
	},
	{
		path: masterDataMenu.measurements.path,
		element: <MASTER_DATA.MEASUREMENTS />,
	},
	{
		path: masterDataMenu.customers.path,
		element: <MASTER_DATA.CUSTOMERS />,
	},
	{
		path: masterDataMenu.loyaltyProgramme.path,
		element: <MASTER_DATA.LOYALTY_PROGRAMME />,
	},
	{
		path: masterDataMenu.giftCards.path,
		element: <MASTER_DATA.GIFT_CARDS />,
	},
	{
		path: masterDataMenu.segments.path,
		element: <MASTER_DATA.SEGMENTS />,
	},
	{
		path: masterDataMenu.campaigns.path,
		element: <MASTER_DATA.CAMPAIGNS />,
	},
	{
		path: masterDataMenu.warehouseAccess.path,
		element: <MASTER_DATA.WAREHOUSE_ACCESS />,
	},
	{
		path: masterDataMenu.showroomAccess.path,
		element: <MASTER_DATA.SHOWROOM_ACCESS />,
	},
	{
		path: masterDataMenu.showrooms.path,
		element: <MASTER_DATA.SHOWROOMS />,
	},
	{
		path: goodsTransferMenu.myRequests.path,
		element: <GOODS_TRANSFER.REQUESTS />,
	},
	{
		path: goodsTransferMenu.review.path,
		element: <GOODS_TRANSFER.REVIEW />,
	},
	{
		path: goodsTransferMenu.warehouseQueue.path,
		element: <GOODS_TRANSFER.WAREHOUSE />,
	},
	{
		path: '/auth-pages/login',
		element: <Login />,
	},
	{
		path: '/auth-pages/sign-up',
		element: <Login isSignUp />,
	},
	{
		path: salesMenu.pos.path,
		element: <SALES.POS />,
	},
	{
		path: salesMenu.salesOrders.path,
		element: <SALES.SALES_ORDERS />,
	},
	{
		path: salesMenu.cashierShifts.path,
		element: <SALES.CASHIER_SHIFTS />,
	},
	{
		path: salesMenu.invoices.path,
		element: <SALES.INVOICES />,
	},
	{
		path: inventoryMenu.stockLedger.path,
		element: <INVENTORY.STOCK_LEDGER />,
	},
	{
		path: inventoryMenu.showroomItemLog.path,
		element: <INVENTORY.SHOWROOM_ITEM_LOG />,
	},
	{
		path: inventoryMenu.barcodeItemLog.path,
		element: <INVENTORY.BARCODE_ITEM_LOG />,
	},
	{
		path: inventoryMenu.warehouses.path,
		element: <INVENTORY.WAREHOUSES />,
	},
	{
		path: productionMenu.sewAndSell.path,
		element: <PRODUCTION.SEW_AND_SELL />,
	},
	{
		path: productionMenu.workOrders.path,
		element: <PRODUCTION.WORK_ORDERS />,
	},
	{
		path: productionMenu.qualityChecks.path,
		element: <PRODUCTION.QUALITY_CHECKS />,
	},
	{
		path: productionMenu.deliveries.path,
		element: <PRODUCTION.DELIVERIES />,
	},
	{
		path: purchasingMenu.suppliers.path,
		element: <PURCHASING.SUPPLIERS />,
	},
	{
		path: purchasingMenu.inquiryReview.path,
		element: <PURCHASING.INQUIRY_REVIEW />,
	},
	{
		path: purchasingMenu.purchaseInquiries.path,
		element: <PURCHASING.PURCHASE_INQUIRIES />,
	},
	{
		path: purchasingMenu.purchaseOrders.path,
		element: <PURCHASING.PURCHASE_ORDERS />,
	},
	{
		path: purchasingMenu.grn.path,
		element: <PURCHASING.GRN />,
	},
	{
		path: importMenu.importShipments.path,
		element: <IMPORT.SHIPMENTS />,
	},
	{
		path: importMenu.importPriceReview.path,
		element: <IMPORT.PRICE_REVIEW />,
	},
	{
		path: importMenu.importReceiving.path,
		element: <IMPORT.RECEIVING />,
	},
	{
		path: importMenu.importQa.path,
		element: <IMPORT.QA />,
	},
	{
		path: importMenu.importGrn.path,
		element: <IMPORT.GRN />,
	},
	{
		path: importMenu.importVat.path,
		element: <IMPORT.VAT />,
	},
	{
		path: importMenu.importHigherApproval.path,
		element: <IMPORT.HIGHER_APPROVAL />,
	},
	{
		path: importMenu.defectiveReasons.path,
		element: <IMPORT.DEFECTIVE_REASONS />,
	},
	// We will map the other menus to ComingSoon later as we build them.
];

export default presentation;
