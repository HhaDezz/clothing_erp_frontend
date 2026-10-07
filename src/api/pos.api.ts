import api from '../lib/axios';

export type CartItemPayload = {
	lineType:
		| 'FINISHED_GOOD'
		| 'READY_MADE'
		| 'SERVICE'
		| 'ADVANCE'
		| 'BALANCE'
		| 'DELIVERY'
		| 'GIFT_CARD';
	// Unused for a GIFT_CARD line (no product behind it) — the backend
	// accepts referenceId as optional, so this is sent as 0 for that line
	// rather than widening every other lineType's contract to allow null.
	referenceId: number;
	qty: number;
	unitPrice: number;
	discount: number;
	// Set when this line came from scanning one physical garment's own
	// unique tag (see PosVariantResponse.barcodeUnitId below) rather than
	// the shared variant barcode or a manual add — checkout flags that
	// exact unit SOLD. Undefined/null for every other line.
	barcodeUnitId?: number | null;
};

export type CartPayload = {
	customerId?: number;
	notes?: string;
	items: CartItemPayload[];
};

export type CartResponse = {
	id: number;
	cashierId: number;
	cashierName?: string;
	customerId?: number;
	customerName?: string;
	shiftId?: number;
	// Derived from the cart's shift — see CashierShiftService#openShift /
	// POS redesign implementation plan, Phase 1. Locked for the shift's
	// whole duration.
	showroomId?: number;
	showroomName?: string;
	status: string;
	notes?: string;
	// Not consumed by the frontend today (cart items live in local React
	// state until checkout) — left loosely typed rather than guessing at
	// CartItemResponse's exact shape.
	items?: unknown[];
};

export type CheckoutPayload = {
	cartId: number;
	// Matches the backend PaymentMethod enum (CASH, CHEQUE, CARD, TRANSFER) —
	// there is no BANK_TRANSFER on the backend.
	paymentMethod: 'CASH' | 'CARD' | 'CHEQUE' | 'TRANSFER';
	amount: number;
	chequeNo?: string;
	bank?: string;
	branch?: string;
	chequeDate?: string;
	payerName?: string;
	notes?: string;
	/**
	 * Cash sales with a customer attached only: keep the change (tendered
	 * minus balance due) as the customer's store credit instead of handing
	 * it back. Ticked by the cashier when the customer agrees.
	 */
	changeToStoreCredit?: boolean;
	/**
	 * Split: how much of the change to keep as store credit — the rest is
	 * handed back in cash. Omitted means all of it. Rejected by the backend
	 * if it is more than the actual change.
	 */
	changeToStoreCreditAmount?: number;
	/**
	 * Loyalty points to apply to this sale. Silently capped server-side to
	 * what the scheme and the customer's balance allow, so the sale is never
	 * rejected for asking to redeem too many — the quote endpoint is what
	 * tells the cashier the real ceiling beforehand.
	 */
	pointsToRedeem?: number;
	/**
	 * Split-tender: store credit, an account charge, and/or a gift card,
	 * each spent alongside (or instead of) `amount`. Unlike points these are
	 * cashier-entered amounts, not quoted maximums — the backend rejects
	 * outright rather than capping if one exceeds what's available.
	 * storeCreditApplied/accountCharge require a customer on the cart;
	 * giftCardCode + giftCardApplied do not (a gift card is a bearer
	 * instrument) but must be sent together.
	 */
	storeCreditApplied?: number;
	accountCharge?: number;
	giftCardCode?: string;
	giftCardApplied?: number;
};

// Minimal shape the printable invoice/PDF needs from a cart line — anything
// with at least these fields (e.g. PosPage's PosCartItem) satisfies it.
export type PosReceiptItem = {
	name: string;
	detail?: string;
	size?: string;
	color?: string;
	barcode?: string;
	qty: number;
	price: number;
	total: number;
};

export type InvoiceResponse = {
	id: number;
	invoiceNo: string;
	invoice_number?: string;
	orderNo?: string;
	order_no?: string;
	salesOrderNo?: string;
	sales_order_no?: string;
	orderId?: number | string;
	order_id?: number | string;
	salesOrderId?: number | string;
	sales_order_id?: number | string;
	order?: {
		id?: number | string;
		orderNo?: string;
		order_no?: string;
	};
	salesOrder?: {
		id?: number | string;
		orderNo?: string;
		order_no?: string;
	};
	sales_order?: {
		id?: number | string;
		orderNo?: string;
		order_no?: string;
	};
	grossTotal: number;
	gross_total?: number;
	totalDiscount: number;
	total_discount?: number;
	netTotal: number;
	net_total?: number;
};

export type CashierShiftPayload = {
	openingCash: number;
	// Required — "only a showroom-assigned user can start a cashier shift
	// for that specific showroom" is enforced server-side in
	// CashierShiftService#openShift. See POS redesign implementation plan,
	// Phase 1/3.
	showroomId: number;
	notes?: string;
};

// Widened to match what CashierShiftResponse.java actually returns — the
// previous version of this type only declared
// {id, cashierId, status, openingTime, openingCash} and was silently
// dropping the rest (and openingTime didn't even match the backend's real
// field name, openedAt).
export type CashierShiftResponse = {
	id: number;
	shiftNo?: string;
	cashierId: number;
	cashierName?: string;
	showroomId?: number;
	showroomName?: string;
	status: string;
	openedAt: string;
	closedAt?: string;
	openingCash: number;
	closingCash?: number;
	cashSales?: number;
	totalSales?: number;
	expectedCash?: number;
	variance?: number;
	notes?: string;
};

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

// POS variant grid + barcode scan — matches the backend's PosVariantResponse
// (PosController), see POS redesign implementation plan, Phase 2/4/6.
export type PosVariantResponse = {
	id: number;
	productId?: number;
	productName?: string;
	sku: string;
	size?: string;
	color?: string;
	barcode?: string;
	sellingPrice: number;
	// Path to GET /variants/{id}/image — unused directly by the grid today
	// since VariantImageThumbnail fetches its own image by variantId, but
	// kept for parity with the backend response.
	imageUrl?: string;
	availableQty: number;
	// Set only when this result came from scanning one physical garment's
	// own unique tag (getVariantByUnitBarcodeApi) rather than the shared
	// variant barcode or the product grid. Carry this straight onto the
	// resulting cart line (as barcodeUnitId) so checkout can flag that
	// exact unit SOLD — see POS redesign implementation plan, Phase 6.
	barcodeUnitId?: number | null;
	unitBarcode?: string | null;
};

// Every active variant, stock-aware for one showroom. `search` narrows by
// product name / SKU / barcode / size / color (case-insensitive, backend-side).
export const getPosVariantsApi = (showroomId: number, search?: string) =>
	api
		.get<ApiResponse<PosVariantResponse[]>>('/variants/pos', {
			params: { showroomId, search: search?.trim() || undefined },
		})
		.then((res) => res.data.data);

// Resolves a scanned/typed barcode to one variant, with its stock at that
// showroom — throws (404) if nothing matches.
export const getVariantByBarcodeApi = (barcode: string, showroomId: number) =>
	api
		.get<ApiResponse<PosVariantResponse>>(`/variants/by-barcode/${encodeURIComponent(barcode)}`, {
			params: { showroomId },
		})
		.then((res) => res.data.data);

// Resolves a scanned/typed code to one PHYSICAL garment's own unique tag
// (generated per unit at goods-transfer time), not the shared variant
// barcode above — throws (404) if no tag matches, or (409) if the tag
// exists but isn't sellable here right now (wrong showroom, not yet issued,
// or already sold — see GoodsTransferService#findSellableUnit). A hit
// carries barcodeUnitId/unitBarcode so the cart line can be tied to this
// exact garment. See POS redesign implementation plan, Phase 6.
export const getVariantByUnitBarcodeApi = (barcode: string, showroomId: number) =>
	api
		.get<ApiResponse<PosVariantResponse>>(`/variants/by-unit-barcode/${encodeURIComponent(barcode)}`, {
			params: { showroomId },
		})
		.then((res) => res.data.data);

// One sellable barcode tag for a variant at a showroom — what POS's tag
// picker lists when an item is added by hand (no scan). See
// PosController#getSellableUnitBarcodes.
export type PosUnitTag = {
	id: number;
	barcode: string;
	unitNo: number;
	requestNo: string;
};

// Every tag for this variant that is physically at this showroom and still
// unsold, oldest transfer first. Empty = nothing taggable to sell here.
export const getSellableUnitTagsApi = (variantId: number, showroomId: number) =>
	api
		.get<ApiResponse<PosUnitTag[]>>(`/variants/${variantId}/unit-barcodes`, {
			params: { showroomId },
		})
		.then((res) => res.data.data ?? []);

// Cart and Checkout
export const checkoutCartApi = (payload: CheckoutPayload) =>
	api.post<ApiResponse<InvoiceResponse>>('/carts/checkout', payload).then((res) => res.data.data);

export const createOrUpdateCartApi = (payload: CartPayload) =>
	api.post<ApiResponse<CartResponse>>('/carts', payload).then((res) => res.data.data);

export const getActiveCartApi = () =>
	api.get<ApiResponse<CartResponse>>('/carts/active').then((res) => res.data.data);

// Cashier Shift
export type CloseShiftPayload = {
	closingCash: number;
	notes?: string;
};

export const openShiftApi = (payload: CashierShiftPayload) =>
	api
		.post<ApiResponse<CashierShiftResponse>>('/cashier-shifts/open', payload)
		.then((res) => res.data.data);

export const closeShiftApi = (payload: CloseShiftPayload) =>
	api
		.post<ApiResponse<CashierShiftResponse>>('/cashier-shifts/close', payload)
		.then((res) => res.data.data);

export const getActiveShiftApi = () =>
	api
		.get<ApiResponse<CashierShiftResponse>>('/cashier-shifts/active')
		.then((res) => res.data.data);
