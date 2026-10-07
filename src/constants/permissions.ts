export const PERMISSIONS = {
	// ADMIN MODULE
	SHOW_USER: 'admin-user-view',
	CREATE_USER: 'admin-user-create',
	UPDATE_USER: 'admin-user-edit',
	DELETE_USER: 'admin-user-delete',

	SHOW_ROLE: 'admin-role-view',
	CREATE_ROLE: 'admin-role-create',
	UPDATE_ROLE: 'admin-role-edit',
	DELETE_ROLE: 'admin-role-delete',

	SHOW_CURRENCY: 'admin-currency-view',
	CREATE_CURRENCY: 'admin-currency-create',
	UPDATE_CURRENCY: 'admin-currency-edit',
	DELETE_CURRENCY: 'admin-currency-delete',

	SHOW_WAREHOUSE: 'admin-warehouse-view',
	CREATE_WAREHOUSE: 'admin-warehouse-create',
	UPDATE_WAREHOUSE: 'admin-warehouse-edit',
	DELETE_WAREHOUSE: 'admin-warehouse-delete',

	// SHOWROOM CRUD — a Showroom is its own master-data page/permission set,
	// even though it's the same underlying Warehouse table as above.
	SHOW_SHOWROOM: 'admin-showroom-view',
	CREATE_SHOWROOM: 'admin-showroom-create',
	UPDATE_SHOWROOM: 'admin-showroom-edit',
	DELETE_SHOWROOM: 'admin-showroom-delete',

	// GOODS TRANSFER — "goods from warehouse to showroom" workflow:
	// Showroom user requests -> SL Operations approves/rejects -> Warehouse
	// store keeper generates barcodes (bulk) and issues -> Showroom confirms.
	SHOW_GOODS_TRANSFER: 'goods_transfer-request-view',
	CREATE_GOODS_TRANSFER: 'goods_transfer-request-create',
	APPROVE_GOODS_TRANSFER: 'goods_transfer-request-approve',
	GENERATE_GOODS_TRANSFER_BARCODES: 'goods_transfer-barcode-generate',
	ISSUE_GOODS_TRANSFER: 'goods_transfer-issue',
	RECEIVE_GOODS_TRANSFER: 'goods_transfer-receive',

	// WAREHOUSE-TO-IMPORT-PROCESS LINKAGE — which warehouse(s) a user is
	// enabled for (separate master-data page from Users/Departments), and
	// editing an import shipment item's per-warehouse delivery split.
	SHOW_WAREHOUSE_ACCESS: 'warehouse-access-view',
	EDIT_WAREHOUSE_ACCESS: 'warehouse-access-edit',

	// SHOWROOM ACCESS — "need separate showroom allocation (users)". Its own
	// dedicated master-data page/permission pair, mirroring Warehouse Access
	// above but scoped to which showroom(s) a user can see/act on in the
	// Goods-to-Showroom workflow.
	SHOW_SHOWROOM_ACCESS: 'showroom-access-view',
	EDIT_SHOWROOM_ACCESS: 'showroom-access-edit',

	// PHASE 1 — MASTER DATA
	SHOW_PRODUCT: 'master_data-product-view',
	CREATE_PRODUCT: 'master_data-product-create',
	UPDATE_PRODUCT: 'master_data-product-edit',
	DELETE_PRODUCT: 'master_data-product-delete',

	// Brands (V93). Reading the list for the product form's dropdown only
	// needs a product permission; these gate the Brands page itself.
	SHOW_BRAND: 'master_data-brand-view',
	CREATE_BRAND: 'master_data-brand-create',
	UPDATE_BRAND: 'master_data-brand-edit',
	DELETE_BRAND: 'master_data-brand-delete',

	SHOW_PRODUCT_VARIANT: 'master_data-product_variant-view',
	CREATE_PRODUCT_VARIANT: 'master_data-product_variant-create',
	UPDATE_PRODUCT_VARIANT: 'master_data-product_variant-edit',
	DELETE_PRODUCT_VARIANT: 'master_data-product_variant-delete',

	SHOW_MATERIAL: 'master_data-material-view',
	CREATE_MATERIAL: 'master_data-material-create',
	UPDATE_MATERIAL: 'master_data-material-edit',
	DELETE_MATERIAL: 'master_data-material-delete',

	SHOW_BOM: 'master_data-bom-view',
	CREATE_BOM: 'master_data-bom-create',
	UPDATE_BOM: 'master_data-bom-edit',
	DELETE_BOM: 'master_data-bom-delete',

	SHOW_MEASUREMENT_TYPE: 'master_data-measurement_type-view',
	CREATE_MEASUREMENT_TYPE: 'master_data-measurement_type-create',
	UPDATE_MEASUREMENT_TYPE: 'master_data-measurement_type-edit',
	DELETE_MEASUREMENT_TYPE: 'master_data-measurement_type-delete',

	SHOW_BODY_MEASUREMENT: 'master_data-body_measurement-view',
	CREATE_BODY_MEASUREMENT: 'master_data-body_measurement-create',
	UPDATE_BODY_MEASUREMENT: 'master_data-body_measurement-edit',
	DELETE_BODY_MEASUREMENT: 'master_data-body_measurement-delete',

	// PHASE 2 — CUSTOMER
	SHOW_CUSTOMER: 'customer-customer-view',
	CREATE_CUSTOMER: 'customer-customer-create',
	UPDATE_CUSTOMER: 'customer-customer-edit',
	DELETE_CUSTOMER: 'customer-customer-delete',

	// Customer 360 — purchase history, favourite items, lifetime spend — and
	// the profile panel at the till. Deliberately separate from
	// SHOW_CUSTOMER above, which only grants the master-data list and form,
	// so a role can maintain customer records without being shown what
	// everyone spends. Seeded in V79.
	SHOW_CUSTOMER_INSIGHTS: 'customer-insights-view',
	// Add a customer mid-sale with just a name and a phone number, without
	// granting the full customer form (CREATE_CUSTOMER).
	QUICK_CREATE_CUSTOMER: 'customer-quick-create',

	// Loyalty (V81). Redeeming is a cashier key — applying the scheme is part
	// of taking money. Adjusting is a manager key: it is the one way points
	// are created without a sale behind them. Settings is an admin key, and
	// deliberately not implied by adjust — changing the rate everyone earns
	// at is a different act from correcting one customer's balance.
	REDEEM_LOYALTY_POINTS: 'customer-loyalty-redeem',
	ADJUST_LOYALTY_POINTS: 'customer-loyalty-adjust',
	MANAGE_LOYALTY_SETTINGS: 'customer-loyalty-settings',

	SHOW_CUSTOMER_MEASUREMENT: 'customer-measurement-view',
	CREATE_CUSTOMER_MEASUREMENT: 'customer-measurement-create',
	UPDATE_CUSTOMER_MEASUREMENT: 'customer-measurement-edit',
	DELETE_CUSTOMER_MEASUREMENT: 'customer-measurement-delete',

	// Wallets & gift cards (V84). "Use" is a cashier key — spending an
	// existing balance/card at the till, or reading one back (wallet
	// summary, a card's own history, what got sold on this order). "Manage"
	// is the back-office key — issuing store credit, opening an account
	// facility, setting a credit limit, voiding or adjusting a card. Neither
	// implies the other, same split as REDEEM/ADJUST for loyalty above.
	USE_CUSTOMER_WALLET: 'customer-wallet-use',
	MANAGE_CUSTOMER_WALLET: 'customer-wallet-manage',
	MANAGE_GIFT_CARDS: 'customer-giftcard-manage',

	// Segments & campaigns (V88) — building an audience and sending to it is
	// one back-office key each; there's no separate "use" tier here since,
	// unlike wallets, nothing about them is touched at the till.
	MANAGE_CUSTOMER_SEGMENTS: 'customer-segment-manage',
	MANAGE_CUSTOMER_CAMPAIGNS: 'customer-campaign-manage',

	// PHASE 3 — INVENTORY
	SHOW_INVENTORY_STOCK: 'inventory-stock-view',
	CREATE_INVENTORY_STOCK_IN: 'inventory-stock_in-create',
	CREATE_INVENTORY_STOCK_OUT: 'inventory-stock_out-create',
	CREATE_INVENTORY_ADJUSTMENT: 'inventory-adjustment-create',
	CREATE_INVENTORY_TRANSFER: 'inventory-transfer-create',
	SHOW_INVENTORY_TRANSACTION: 'inventory-transaction-view',
	SHOW_INVENTORY_LOW_STOCK: 'inventory-low_stock-view',

	// PHASE 4 — SALES & CASHIER
	CREATE_CART: 'sales-cart-create',
	CHECKOUT_CART: 'sales-cart-checkout',
	SHOW_SALES_ORDER: 'sales-sales_order-view',
	SHOW_INVOICE: 'sales-invoice-view',
	SHOW_CASHIER_SHIFT: 'sales-cashier_shift-view',
	// MANAGE_CASHIER_SHIFT: 'sales-cashier_shift-manage',

	// PHASE 5 — PRODUCTION & DELIVERY
	SHOW_SEW_AND_SELL_ORDER: 'production-sew_and_sell_order-view',
	CREATE_SEW_AND_SELL_ORDER: 'production-sew_and_sell_order-create',
	SHOW_WORK_ORDER: 'production-work_order-view',
	CREATE_WORK_ORDER: 'production-work_order-create',
	SHOW_QUALITY_CHECK: 'production-quality_check-view',
	CREATE_QUALITY_CHECK: 'production-quality_check-create',
	SHOW_PRODUCTION_STAGE: 'production-production_stage-view',
	CREATE_PRODUCTION_STAGE: 'production-production_stage-create',
	SHOW_DELIVERY: 'production-delivery-view',
	CREATE_DELIVERY: 'production-delivery-create',
	UPDATE_DELIVERY: 'production-delivery-edit',

	// PHASE 6 — PURCHASING
	SHOW_SUPPLIER: 'purchasing-supplier-view',
	CREATE_SUPPLIER: 'purchasing-supplier-create',
	UPDATE_SUPPLIER: 'purchasing-supplier-edit',
	DELETE_SUPPLIER: 'purchasing-supplier-delete',
	SHOW_PURCHASE_ORDER: 'purchasing-purchase_order-view',
	CREATE_PURCHASE_ORDER: 'purchasing-purchase_order-create',
	UPDATE_PURCHASE_ORDER: 'purchasing-purchase_order-edit',
	SHOW_GRN: 'purchasing-goods_received_note-view',
	CREATE_GRN: 'purchasing-goods_received_note-create',
	UPDATE_GRN: 'purchasing-goods_received_note-edit',

	// REPORTING & AUDIT
	SHOW_REPORT: 'reporting-report-view',
	SHOW_AUDIT_LOG: 'reporting-audit_log-view',
	// Manager-only — "live profit need to be displayed when sales made", kept
	// off the cashier's own POS screen, so it's its own permission rather
	// than being folded into SHOW_REPORT.
	SHOW_PROFIT_REPORT: 'reporting-profit-view',

	// PROCUREMENT — INQUIRY WORKFLOW
	SHOW_INQUIRY: 'procurement-inquiry-view',
	CREATE_INQUIRY: 'procurement-inquiry-create',
	UPDATE_INQUIRY: 'procurement-inquiry-edit',
	// SUBMIT_INQUIRY / APPROVE_INQUIRY below are the old coarse permissions —
	// no longer checked anywhere in the frontend or backend as of V58, which
	// split each status-transition step out into its own dedicated
	// permission (still present in the DB / Roles & Permissions screen so
	// nothing that already held them silently loses a grant; safe to retire
	// from Roles & Permissions once every role has been reviewed).
	SUBMIT_INQUIRY: 'procurement-inquiry-submit',
	APPROVE_INQUIRY: 'procurement-inquiry-approve',
	SEND_INQUIRY_TO_GF: 'procurement-inquiry-send-gf',
	GF_CONFIRM_INQUIRY: 'procurement-inquiry-gf-confirm',
	SL_RECONFIRM_INQUIRY: 'procurement-inquiry-sl-reconfirm',
	FINANCE_APPROVE_INQUIRY: 'procurement-inquiry-finance-approve',
	SEND_INQUIRY_PO_TO_GF: 'procurement-inquiry-send-po',
	UPLOAD_INQUIRY_PI: 'procurement-inquiry-upload-pi',
	UPLOAD_INQUIRY_TT: 'procurement-inquiry-upload-tt',
	FINALIZE_INQUIRY_PO: 'procurement-inquiry-finalize',
	// V60: brand new, standalone permission for the post-finalize "ask GF to
	// ship the goods" step — deliberately not bundled with FINALIZE_INQUIRY_PO
	// or any other existing permission; assign it explicitly per role.
	REQUEST_GOODS_INQUIRY: 'procurement-inquiry-request-goods',
	SHOW_NOTIFICATION: 'procurement-notification-view',

	// IMPORT PROCESS — GF Warehouse import -> GRN -> inventory workflow
	SHOW_IMPORT_SHIPMENT: 'import-shipment-view',
	CREATE_IMPORT_SHIPMENT: 'import-shipment-create',
	CREATE_IMPORT_SHIPMENT_NEW: 'import-shipment-create_new',
	UPDATE_IMPORT_SHIPMENT: 'import-shipment-edit',
	DELETE_IMPORT_SHIPMENT: 'import-shipment-delete',
	SUBMIT_IMPORT_COSTING: 'import-costing-submit',
	REVIEW_IMPORT_PRICE_START: 'import-price-review-start',
	REVIEW_IMPORT_PRICE: 'import-price-review',
	FINANCE_APPROVE_IMPORT_PRICE: 'import-price-finance-approve',
	RECEIVE_IMPORT_BAY1: 'import-receiving',
	QA_IMPORT_BAY2: 'import-qa',
	GENERATE_IMPORT_GRN: 'import-grn-generate',
	FINANCE_VAT_IMPORT: 'import-vat-finance',
	HIGHER_APPROVE_IMPORT: 'import-higher-approve',

	SHOW_DEFECTIVE_REASON: 'import-defective_reason-view',
	CREATE_DEFECTIVE_REASON: 'import-defective_reason-create',
	UPDATE_DEFECTIVE_REASON: 'import-defective_reason-edit',
	DELETE_DEFECTIVE_REASON: 'import-defective_reason-delete',

	// Editing an import shipment item's warehouse delivery split — viewing it
	// piggybacks on SHOW_IMPORT_SHIPMENT (same as GRN/defects, shown as part
	// of the shipment detail a viewer can already see).
	EDIT_IMPORT_WAREHOUSE_ALLOCATION: 'import-shipment-warehouse-allocation-edit',
} as const;

export type AppPermission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type PermissionRequirement = AppPermission | AppPermission[] | string | string[];

export const ALL_PERMISSIONS_ARRAY = Object.values(PERMISSIONS);
