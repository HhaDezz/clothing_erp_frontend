import api from '../lib/axios';
import { Variant } from './products.api';

type ApiResponse<T> = {
	success: boolean;
	message: string;
	data: T;
};

export type SalesOrderItem = {
	id: number;
	variantId: number;
	variantSku?: string;
	sku?: string;
	productName?: string;
	product?: { name?: string };
	variant?: (Partial<Variant> & { productName?: string; product?: { name?: string } }) | null;
	qty: number;
	unitPrice: number;
	discount: number;
	lineTotal: number;
	// What the backend actually calls a line's total (SalesOrderItem
	// .totalPrice) — see getSalesOrderLineTotal below.
	totalPrice?: number;
};

export type SalesOrder = {
	id: number;
	orderNo: string;
	orderType: string;
	customerId: number;
	customerName: string;
	showroomId?: number | null;
	showroomName?: string | null;
	status: string;
	paymentStatus: string;
	totalAmount: number;
	totalDiscount: number;
	netAmount: number;
	// Denormalized on the order at checkout time (V89) — "when customer uses
	// points, sales order view should also change, should show customer used
	// 100 points". Absent/0 means no points were redeemed, including every
	// order from before this field existed.
	pointsRedeemed?: number;
	redeemedValue?: number;
	// The other non-cash tenders used on the sale (V90) — store credit spent,
	// the amount charged to the customer's pay-later account, and gift card
	// value redeemed with that card's code. Absent/0 when not used.
	storeCreditApplied?: number;
	accountCharge?: number;
	giftCardApplied?: number;
	giftCardCode?: string | null;
	// Cash change the customer kept as store credit instead of taking back
	// (V91). Absent/0 when change was handed over as usual.
	changeToStoreCredit?: number;
	// Cash handed over and total change due on a cash sale (V92). 0/absent
	// for non-cash sales and for orders made before these were stored.
	cashTendered?: number;
	changeAmount?: number;
	notes: string;
	createdAt: string;
	items: SalesOrderItem[];
};

// A line's total. The backend's field is `totalPrice`; `lineTotal` is what
// this type originally assumed, which left every order's "Line Total"
// showing Rs. 0.00 on screen and on the reprinted receipt. Falls back to
// (unit price − per-unit discount) × qty if neither is present.
export const getSalesOrderLineTotal = (item: SalesOrderItem): number =>
	Number(item.lineTotal) ||
	Number(item.totalPrice) ||
	Math.max(0, (Number(item.unitPrice) || 0) - (Number(item.discount) || 0)) * (Number(item.qty) || 0);

// Everything on an order that settled part of the bill without cash/card
// changing hands at the till — "credit options and gift card options and
// store credits used in sales should also show in receipt and views too".
// One entry per tender actually used, in the order they print.
export type SalesOrderTender = {
	key: 'points' | 'storeCredit' | 'account' | 'giftCard';
	label: string;
	amount: number;
};

type TenderSource = {
	netAmount?: number | null;
	pointsRedeemed?: number | null;
	redeemedValue?: number | null;
	storeCreditApplied?: number | null;
	accountCharge?: number | null;
	giftCardApplied?: number | null;
	giftCardCode?: string | null;
};

export const getSalesOrderTenders = (order: TenderSource): SalesOrderTender[] => {
	const tenders: SalesOrderTender[] = [];
	const points = Number(order.redeemedValue) || 0;
	const storeCredit = Number(order.storeCreditApplied) || 0;
	const account = Number(order.accountCharge) || 0;
	const giftCard = Number(order.giftCardApplied) || 0;
	if (points > 0) {
		tenders.push({
			key: 'points',
			label: `Loyalty Points Redeemed (-${Number(order.pointsRedeemed) || 0} pts)`,
			amount: points,
		});
	}
	if (storeCredit > 0) tenders.push({ key: 'storeCredit', label: 'Store Credit', amount: storeCredit });
	if (account > 0) tenders.push({ key: 'account', label: 'Charged to Account', amount: account });
	if (giftCard > 0) {
		tenders.push({
			key: 'giftCard',
			label: `Gift Card${order.giftCardCode ? ` (${order.giftCardCode})` : ''}`,
			amount: giftCard,
		});
	}
	return tenders;
};

// What was actually collected at the till (cash / card / cheque / transfer)
// once every tender above is taken off. Net Amount stays what the goods
// sold for.
export const getSalesOrderPaidAmount = (order: TenderSource): number =>
	Math.max(
		0,
		(Number(order.netAmount) || 0) -
			getSalesOrderTenders(order).reduce((sum, tender) => sum + tender.amount, 0),
	);

// Every active sales order — used by the Sales Orders list page.
export const getSalesOrdersApi = () =>
	api.get<ApiResponse<SalesOrder[]>>('/sales-orders').then((res) => res.data.data ?? []);

// One order by id — used to open its "View Details" modal from anywhere
// that only has the order's id/number on hand (e.g. the Barcode Item Log's
// "Sales Order" column), without navigating away or loading the full list.
// Requires `sales-sales_order-view`, the same permission the Sales Orders
// page itself is gated on.
export const getSalesOrderByIdApi = (id: number) =>
	api.get<ApiResponse<SalesOrder>>(`/sales-orders/${id}`).then((res) => res.data.data);
