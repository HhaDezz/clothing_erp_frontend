export const dashboardPagesMenu = {
	dashboard: {
		id: 'dashboard',
		text: 'Dashboard',
		path: '/',
		icon: 'Dashboard',
		subMenu: null,
	},
};

export const masterDataMenu = {
	masterData: {
		id: 'masterData',
		text: 'Admin',
		icon: 'Settings',
	},
	users: {
		id: 'users',
		text: 'Users',
		path: '/master-data/users',
		icon: 'People',
		permission: 'admin-user-view',
		subMenu: null,
	},
	roles: {
		id: 'roles',
		text: 'Roles & Permissions',
		path: '/master-data/roles',
		icon: 'AdminPanelSettings',
		permission: 'admin-role-view',
		subMenu: null,
	},
	products: {
		id: 'products',
		text: 'Products & Variants',
		path: '/master-data/products',
		icon: 'Inventory2',
		permission: 'master_data-product-view',
		subMenu: null,
	},
	// Brands (V93) — the managed list behind the Brand dropdown on the
	// product form.
	brands: {
		id: 'brands',
		text: 'Brands',
		path: '/master-data/brands',
		icon: 'LocalOffer',
		permission: 'master_data-brand-view',
		subMenu: null,
	},
	materials: {
		id: 'materials',
		text: 'Materials & BOM',
		path: '/master-data/materials',
		icon: 'Architecture',
		permission: 'master_data-material-view',
		subMenu: null,
	},
	measurements: {
		id: 'measurements',
		text: 'Measurement Setup',
		path: '/master-data/measurements',
		icon: 'Straighten',
		permission: 'master_data-measurement_type-view',
		subMenu: null,
	},
	customers: {
		id: 'customers',
		text: 'Customers',
		path: '/master-data/customers',
		icon: 'ContactPage',
		permission: 'customer-customer-view',
		subMenu: null,
	},
	// The loyalty scheme's admin portal — earn rate, redemption caps, the
	// per-line margin guards and the tiers. Gated on the insights permission
	// so a manager can READ the scheme (the POS needs the earn rate to show a
	// cashier what a sale is worth); changing it needs
	// customer-loyalty-settings, enforced in the page and on the API.
	loyaltyProgramme: {
		id: 'loyaltyProgramme',
		text: 'Loyalty Programme',
		path: '/master-data/loyalty',
		icon: 'CardGiftcard',
		permission: 'customer-insights-view',
		subMenu: null,
	},
	// Gift Card Log — every card issued or sold, its balance and movements.
	// Reading is the insights permission (same as the API's list endpoint);
	// issuing/voiding from the page needs customer-giftcard-manage.
	giftCards: {
		id: 'giftCards',
		text: 'Gift Card Log',
		path: '/master-data/gift-cards',
		icon: 'Redeem',
		permission: 'customer-insights-view',
		subMenu: null,
	},
	// Segments & campaigns (V87/V88) — who to target and what to send them.
	// Kept next to Customers/Loyalty in the Admin section since they're the
	// same "customer data" people who'd build an audience and message it.
	segments: {
		id: 'customerSegments',
		text: 'Customer Segments',
		path: '/master-data/segments',
		icon: 'Groups',
		permission: 'customer-segment-manage',
		subMenu: null,
	},
	campaigns: {
		id: 'campaigns',
		text: 'Campaigns',
		path: '/master-data/campaigns',
		icon: 'Campaign',
		permission: 'customer-campaign-manage',
		subMenu: null,
	},
	warehouseAccess: {
		id: 'warehouseAccess',
		text: 'Warehouse Access',
		path: '/master-data/warehouse-access',
		icon: 'Store',
		permission: 'warehouse-access-view',
		subMenu: null,
	},
	showroomAccess: {
		id: 'showroomAccess',
		text: 'Showroom Access',
		path: '/master-data/showroom-access',
		icon: 'Storefront',
		permission: 'showroom-access-view',
		subMenu: null,
	},
	showrooms: {
		id: 'showrooms',
		text: 'Showrooms',
		path: '/master-data/showrooms',
		icon: 'Storefront',
		permission: 'admin-showroom-view',
		subMenu: null,
	},
};

export const goodsTransferMenu = {
	goodsTransfer: {
		id: 'goodsTransfer',
		text: 'Goods to Showroom',
		icon: 'LocalShipping',
	},
	myRequests: {
		id: 'goodsTransferRequests',
		text: 'Showroom Requests',
		path: '/goods-transfer/requests',
		icon: 'AddShoppingCart',
		permission: ['goods_transfer-request-create', 'goods_transfer-request-view', 'goods_transfer-receive'],
		subMenu: null,
	},
	review: {
		id: 'goodsTransferReview',
		text: 'Approve Requests',
		path: '/goods-transfer/review',
		icon: 'RateReview',
		permission: 'goods_transfer-request-approve',
		subMenu: null,
	},
	warehouseQueue: {
		id: 'goodsTransferWarehouse',
		text: 'Barcode & Issue',
		path: '/goods-transfer/warehouse',
		icon: 'QrCode',
		permission: ['goods_transfer-barcode-generate', 'goods_transfer-issue'],
		subMenu: null,
	},
};

export const salesMenu = {
	sales: {
		id: 'sales',
		text: 'Sales & POS',
		icon: 'PointOfSale',
	},
	pos: {
		id: 'pos',
		text: 'Point of Sale',
		path: '/sales/pos',
		icon: 'ShoppingCart',
		permission: 'sales-cart-create',
		subMenu: null,
	},
	cashierShifts: {
		id: 'cashierShifts',
		text: 'Cashier Shifts',
		path: '/sales/shifts',
		icon: 'Timer',
		permission: 'sales-cashier_shift-view',
		subMenu: null,
	},
	salesOrders: {
		id: 'salesOrders',
		text: 'Sales Orders',
		path: '/sales/orders',
		icon: 'Receipt',
		permission: 'sales-sales_order-view',
		subMenu: null,
	},
	invoices: {
		id: 'invoices',
		text: 'Invoices & Payments',
		path: '/sales/invoices',
		icon: 'AccountBalanceWallet',
		permission: 'sales-invoice-view',
		subMenu: null,
	},
};

export const productionMenu = {
	production: {
		id: 'production',
		text: 'Production',
		// 'Factory' isn't in this icon set — Icon.tsx silently renders
		// nothing for an unrecognized name, which is why this had no icon.
		icon: 'PrecisionManufacturing',
	},
	sewAndSell: {
		id: 'sewAndSell',
		text: 'Sew & Sell Orders',
		path: '/production/sew-and-sell',
		icon: 'DryCleaning',
		permission: 'production-sew_and_sell_order-view',
		subMenu: null,
	},
	workOrders: {
		id: 'workOrders',
		text: 'Work Orders',
		path: '/production/work-orders',
		icon: 'Assignment',
		permission: 'production-work_order-view',
		subMenu: null,
	},
	qualityChecks: {
		id: 'qualityChecks',
		text: 'Quality Checks',
		path: '/production/quality-checks',
		icon: 'Verified',
		permission: 'production-quality_check-view',
		subMenu: null,
	},
	deliveries: {
		id: 'deliveries',
		text: 'Deliveries',
		path: '/production/deliveries',
		icon: 'LocalShipping',
		permission: 'production-delivery-view',
		subMenu: null,
	},
};

export const purchasingMenu = {
	purchasing: {
		id: 'purchasing',
		text: 'Purchasing',
		icon: 'LocalMall',
	},
	purchaseInquiries: {
		id: 'purchaseInquiries',
		text: 'Purchase Inquiries',
		path: '/purchasing/inquiries',
		icon: 'FindInPage',
		permission: 'procurement-inquiry-view',
		subMenu: null,
	},
	inquiryReview: {
		id: 'inquiryReview',
		text: 'Inquiry Review',
		path: '/purchasing/inquiry-review',
		icon: 'RateReview',
		// Gated on the same permission as "Send to GF Office" — this page's
		// whole purpose is that step, so it only shows for Procurement.
		permission: 'procurement-inquiry-send-gf',
		subMenu: null,
	},
	suppliers: {
		id: 'suppliers',
		text: 'Suppliers',
		path: '/purchasing/suppliers',
		icon: 'Business',
		permission: 'purchasing-supplier-view',
		subMenu: null,
	},

	purchaseOrders: {
		id: 'purchaseOrders',
		text: 'Purchase Orders',
		path: '/purchasing/orders',
		icon: 'RequestQuote',
		permission: 'purchasing-purchase_order-view',
		subMenu: null,
	},
	grn: {
		id: 'grn',
		text: 'Goods Received Note',
		path: '/purchasing/grn',
		icon: 'Inventory',
		permission: 'purchasing-goods_received_note-view',
		subMenu: null,
	},
};

export const importMenu = {
	importProcess: {
		id: 'importProcess',
		text: 'Import Process',
		icon: 'LocalShipping',
	},
	importShipments: {
		id: 'importShipments',
		text: 'Import Shipments',
		path: '/import/shipments',
		icon: 'Inventory',
		permission: 'import-shipment-view',
		subMenu: null,
	},
	importPriceReview: {
		id: 'importPriceReview',
		text: 'Price Review',
		path: '/import/price-review',
		icon: 'RateReview',
		// All three steps this page offers live here (Procurement's start-review,
		// review/submit, and Finance's price-change approval) — visible to any
		// department holding one of them; each row's own actions are still
		// gated per-permission on the page.
		permission: ['import-price-review-start', 'import-price-review', 'import-price-finance-approve'],
		subMenu: null,
	},
	importReceiving: {
		id: 'importReceiving',
		text: 'Incoming Shipments',
		path: '/import/receiving',
		icon: 'Inventory',
		permission: 'import-receiving',
		subMenu: null,
	},
	importQa: {
		id: 'importQa',
		text: 'QA — Bay 2',
		path: '/import/qa',
		icon: 'Verified',
		permission: 'import-qa',
		subMenu: null,
	},
	importGrn: {
		id: 'importGrn',
		text: 'GRN Generation',
		path: '/import/grn',
		icon: 'Description',
		permission: 'import-grn-generate',
		subMenu: null,
	},
	importVat: {
		id: 'importVat',
		text: 'VAT and Final Pricing',
		path: '/import/vat',
		icon: 'Receipt',
		permission: 'import-vat-finance',
		subMenu: null,
	},
	importHigherApproval: {
		id: 'importHigherApproval',
		text: 'Higher Approval',
		path: '/import/higher-approval',
		icon: 'VerifiedUser',
		permission: 'import-higher-approve',
		subMenu: null,
	},
	defectiveReasons: {
		id: 'defectiveReasons',
		text: 'Defective Reasons',
		path: '/import/defective-reasons',
		icon: 'ReportProblem',
		permission: 'import-defective_reason-view',
		subMenu: null,
	},
	// Next phase: automatic stock commitment (step 10) — see the "Import
	// Process Implementation Plan" doc.
};

export const inventoryMenu = {
	inventory: {
		id: 'inventory',
		text: 'Inventory',
		// 'Warehouse' isn't in this icon set either — same silent-blank bug.
		icon: 'Inventory',
	},
	stockLedger: {
		id: 'stockLedger',
		text: 'Stock Ledger',
		path: '/inventory/ledger',
		icon: 'MenuBook',
		permission: 'inventory-transaction-view',
		subMenu: null,
	},
	showroomItemLog: {
		id: 'showroomItemLog',
		text: 'Showroom Item Log',
		path: '/inventory/showroom-log',
		icon: 'Storefront',
		permission: 'inventory-transaction-view',
		subMenu: null,
	},
	barcodeItemLog: {
		id: 'barcodeItemLog',
		text: 'Barcode Item Log',
		path: '/inventory/barcode-log',
		icon: 'QrCode',
		permission: 'inventory-transaction-view',
		subMenu: null,
	},
	warehouses: {
		id: 'warehouses',
		text: 'Warehouses',
		path: '/inventory/warehouses',
		icon: 'Store',
		permission: 'admin-warehouse-view',
		subMenu: null,
	},
};

export const reportsMenu = {
	reports: {
		id: 'reports',
		text: 'Reports',
		icon: 'Assessment',
	},
	overview: {
		id: 'reportsOverview',
		text: 'Report Center',
		path: '/reports',
		icon: 'Dashboard',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	sales: {
		id: 'salesReport',
		text: 'Sales',
		path: '/reports/sales',
		icon: 'TrendingUp',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	payments: {
		id: 'paymentsReport',
		text: 'Payments & Cheques',
		path: '/reports/payments',
		icon: 'Payments',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	inventory: {
		id: 'inventoryReport',
		text: 'Inventory',
		path: '/reports/inventory',
		icon: 'Inventory2',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	purchasing: {
		id: 'purchasingReport',
		text: 'Purchasing',
		path: '/reports/purchasing',
		icon: 'LocalMall',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	purchasingInquiry: {
		id: 'purchasingInquiryReport',
		text: 'Purchasing (Inquiry Wise)',
		path: '/reports/purchasing-inquiries',
		icon: 'LocalMall',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	production: {
		id: 'productionReport',
		text: 'Production',
		path: '/reports/production',
		icon: 'PrecisionManufacturing',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	quality: {
		id: 'qualityReport',
		text: 'Quality Control',
		path: '/reports/quality',
		icon: 'Verified',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	deliveries: {
		id: 'deliveryReport',
		text: 'Deliveries',
		path: '/reports/deliveries',
		icon: 'LocalShipping',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	customers: {
		id: 'customerReport',
		text: 'Customers & Measurements',
		path: '/reports/customers',
		icon: 'People',
		permission: 'reporting-report-view',
		subMenu: null,
	},
	auditLogs: {
		id: 'auditLogs',
		text: 'Audit Logs',
		path: '/reports/audit-logs',
		icon: 'ListAlt',
		permission: 'reporting-audit_log-view',
		subMenu: null,
	},
	// Manager-only — "live profit need to be displayed when sales made", kept
	// off the cashier's own POS screen, so it's gated on its own permission
	// rather than reporting-report-view.
	liveProfit: {
		id: 'liveProfitReport',
		text: 'Live Profit',
		path: '/reports/live-profit',
		icon: 'TrendingUp',
		permission: 'reporting-profit-view',
		subMenu: null,
	},
};
